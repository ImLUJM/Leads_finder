import { extractLeadCandidates } from "./lead-extractor.js";
import { getBraveErrorMessage, isQuotaLimited } from "./brave-client.js";
import { sleep } from "./utils.js";

export class SearchPipeline {
  constructor({ braveClient, store, requestDelayMs }) {
    this.braveClient = braveClient;
    this.store = store;
    this.requestDelayMs = requestDelayMs;
    this.runningJobs = new Set();
    this.controllers = new Map();
  }

  async runJob(jobId) {
    if (this.runningJobs.has(jobId)) {
      return;
    }

    const job = await this.store.getJob(jobId);
    if (!job) {
      return;
    }

    if (!this.braveClient.isConfigured) {
      await this.failJob(jobId, "Missing BRAVE_API_KEY. Unable to start search.");
      return;
    }

    const controller = new AbortController();
    this.controllers.set(jobId, controller);
    this.runningJobs.add(jobId);

    try {
      await this.store.updateJob(jobId, {
        status: "running",
        startedAt: new Date().toISOString()
      });

      await this.store.addEvent(jobId, "job.started", "Job started. Running Brave preflight.", {
        totalQueries: job.totalQueries
      });

      const probeQuery = job.queryPlan[0];
      const probeResponse = await this.braveClient.search({
        query: probeQuery.text,
        country: job.inputPayload.braveCountry,
        searchLanguage: job.inputPayload.searchLanguage,
        signal: controller.signal
      });

      if (!probeResponse.ok) {
        if (isQuotaLimited(probeResponse)) {
          await this.failJob(jobId, "Brave quota exhausted. Collector did not continue.", probeResponse);
          return;
        }

        await this.failJob(jobId, `Brave preflight failed: ${getBraveErrorMessage(probeResponse)}`, probeResponse);
        return;
      }

      await this.store.addEvent(jobId, "brave.probe.ok", "Brave preflight succeeded. Running queries.", {
        sampleResults: probeResponse.results.length
      });

      let completedQueries = 0;
      let successQueries = 0;
      let failedQueries = 0;
      const statusBreakdown = {};

      for (const queryMeta of job.queryPlan) {
        if (controller.signal.aborted) {
          await this.store.updateJob(jobId, {
            status: "cancelled",
            completedAt: new Date().toISOString(),
            currentQuery: "",
            progress: {
              currentQuery: "",
              percent: Math.round((completedQueries / Math.max(job.totalQueries, 1)) * 100),
              completedQueries,
              totalQueries: job.totalQueries,
              statusBreakdown
            }
          });
          await this.store.addEvent(jobId, "job.cancelled", "Job cancelled.");
          return;
        }

        await this.store.updateJob(jobId, {
          currentQuery: queryMeta.text,
          progress: {
            currentQuery: queryMeta.text,
            currentQueryIndex: queryMeta.index + 1,
            totalQueries: job.totalQueries,
            completedQueries,
            percent: Math.round((completedQueries / Math.max(job.totalQueries, 1)) * 100),
            statusBreakdown
          }
        });

        await this.store.addEvent(
          jobId,
          "query.started",
          `Running query ${queryMeta.index + 1}/${job.totalQueries}`,
          {
            query: queryMeta.text,
            platform: queryMeta.platformId
          }
        );

        const response = await this.braveClient.search({
          query: queryMeta.text,
          country: job.inputPayload.braveCountry,
          searchLanguage: job.inputPayload.searchLanguage,
          signal: controller.signal
        });

        statusBreakdown[response.status] = (statusBreakdown[response.status] || 0) + 1;

        if (!response.ok) {
          failedQueries += 1;
          completedQueries += 1;

          await this.store.addEvent(jobId, "query.failed", getBraveErrorMessage(response), {
            query: queryMeta.text,
            status: response.status
          });

          if (isQuotaLimited(response)) {
            await this.failJob(jobId, "Brave quota exhausted. Job stopped.", response, {
              completedQueries,
              successQueries,
              failedQueries,
              statusBreakdown
            });
            return;
          }

          await this.store.updateJob(jobId, {
            completedQueries,
            failedQueries,
            progress: {
              totalQueries: job.totalQueries,
              completedQueries,
              percent: Math.round((completedQueries / Math.max(job.totalQueries, 1)) * 100),
              statusBreakdown
            }
          });

          await sleep(this.requestDelayMs);
          continue;
        }

        successQueries += 1;
        completedQueries += 1;
        let insertedLeads = 0;
        let refinedInserted = 0;
        let phoneHits = 0;
        const uniqueUrls = new Set();

        for (const result of response.results) {
          uniqueUrls.add(result.url);

          const candidates = extractLeadCandidates(
            {
              ...result,
              queryText: queryMeta.text,
              platform: queryMeta.platformId
            },
            job
          );

          if (candidates.length) {
            phoneHits += 1;
          }

          for (const lead of candidates) {
            const upsertResult = await this.store.upsertLead(jobId, lead);
            if (upsertResult.inserted) {
              insertedLeads += 1;
              if (upsertResult.lead.qualityTier === "refined") {
                refinedInserted += 1;
              }
            } else if (upsertResult.refinedUpgraded) {
              refinedInserted += 1;
            }
          }
        }

        const leadStats = this.store.buildLeadStats(jobId);

        await this.store.addEvent(jobId, "query.completed", `Query finished. ${insertedLeads} new leads added.`, {
          query: queryMeta.text,
          status: response.status,
          resultCount: response.results.length,
          phoneHitCount: phoneHits,
          uniqueUrlCount: uniqueUrls.size,
          insertedLeads,
          refinedInserted
        });

        await this.store.updateJob(jobId, {
          completedQueries,
          successQueries,
          failedQueries,
          savedLeads: leadStats.savedLeads,
          refinedLeads: leadStats.refinedLeads,
          progress: {
            totalQueries: job.totalQueries,
            completedQueries,
            percent: Math.round((completedQueries / Math.max(job.totalQueries, 1)) * 100),
            statusBreakdown,
            platformBreakdown: leadStats.platformBreakdown
          }
        });

        await sleep(this.requestDelayMs);
      }

      const finalLeadStats = this.store.buildLeadStats(jobId);
      const finalStatus = failedQueries > 0 ? "completed_with_warnings" : "completed";

      await this.store.updateJob(jobId, {
        status: finalStatus,
        currentQuery: "",
        completedAt: new Date().toISOString(),
        completedQueries,
        successQueries,
        failedQueries,
        savedLeads: finalLeadStats.savedLeads,
        refinedLeads: finalLeadStats.refinedLeads,
        progress: {
          totalQueries: job.totalQueries,
          completedQueries,
          percent: 100,
          statusBreakdown,
          platformBreakdown: finalLeadStats.platformBreakdown,
          currentQuery: ""
        }
      });

      await this.store.addEvent(jobId, "job.completed", "Job completed.", {
        savedLeads: finalLeadStats.savedLeads,
        refinedLeads: finalLeadStats.refinedLeads,
        failedQueries
      });
    } catch (error) {
      if (error.name === "AbortError") {
        await this.store.updateJob(jobId, {
          status: "cancelled",
          completedAt: new Date().toISOString(),
          currentQuery: ""
        });
        await this.store.addEvent(jobId, "job.cancelled", "Job cancelled.");
      } else {
        await this.failJob(jobId, error.message || "Job failed unexpectedly");
      }
    } finally {
      this.runningJobs.delete(jobId);
      this.controllers.delete(jobId);
    }
  }

  async cancelJob(jobId) {
    const controller = this.controllers.get(jobId);
    if (controller) {
      controller.abort();
      return true;
    }

    return false;
  }

  async failJob(jobId, message, response, stats = {}) {
    await this.store.updateJob(jobId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      currentQuery: "",
      lastError: message,
      ...stats,
      progress: {
        ...stats,
        currentQuery: ""
      }
    });

    await this.store.addEvent(jobId, "job.failed", message, {
      status: response?.status,
      detail: response?.data?.detail || response?.data?.message || ""
    });
  }
}
