import { createId, nowIso, writeSseMessage } from "./utils.js";
import { mergeLeadRecords } from "./lead-extractor.js";

export class JobStore {
  constructor(repository) {
    this.repository = repository;
    this.jobs = new Map();
    this.events = new Map();
    this.leads = new Map();
    this.subscribers = new Map();
  }

  async createJob(input, queryPlan) {
    const job = {
      id: createId(),
      status: "pending",
      searchTerm: input.searchTerm,
      phoneCode: input.phoneCode,
      country: input.country,
      city: input.city,
      industryGroup: input.industryGroup,
      poolType: input.poolType,
      queryMode: input.queryMode,
      platforms: input.platforms,
      queryPlan,
      inputPayload: {
        searchLanguage: input.searchLanguage,
        braveCountry: input.braveCountry,
        industryLabel: input.industryLabel,
        industryEnglishLabel: input.industryEnglishLabel
      },
      queryCount: queryPlan.length,
      totalQueries: queryPlan.length,
      completedQueries: 0,
      successQueries: 0,
      failedQueries: 0,
      savedLeads: 0,
      refinedLeads: 0,
      currentQuery: "",
      progress: {
        totalQueries: queryPlan.length,
        completedQueries: 0,
        percent: 0,
        statusBreakdown: {}
      },
      lastError: "",
      startedAt: "",
      completedAt: "",
      createdAt: nowIso()
    };

    this.jobs.set(job.id, job);
    this.events.set(job.id, []);
    this.leads.set(job.id, new Map());
    await this.persistSafely(() => this.repository.persistJob(job));
    return job;
  }

  async getJob(jobId) {
    const inMemory = this.jobs.get(jobId);
    if (inMemory) {
      return inMemory;
    }

    const persisted = await this.repository.fetchJob(jobId);
    if (persisted) {
      this.jobs.set(jobId, persisted);
    }
    return persisted;
  }

  async listJobs(limit = 12) {
    const normalizedLimit = Math.max(1, Math.min(50, Number(limit) || 12));
    const inMemoryJobs = [...this.jobs.values()];

    if (!this.repository.isConfigured) {
      return inMemoryJobs
        .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
        .slice(0, normalizedLimit);
    }

    try {
      const persistedJobs = await this.repository.fetchJobs(normalizedLimit);
      const merged = new Map();

      persistedJobs.forEach((job) => {
        merged.set(job.id, job);
      });

      inMemoryJobs.forEach((job) => {
        const current = merged.get(job.id);
        merged.set(job.id, {
          ...(current || {}),
          ...job,
          progress: {
            ...(current?.progress || {}),
            ...(job.progress || {})
          }
        });
      });

      return [...merged.values()]
        .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
        .slice(0, normalizedLimit);
    } catch (error) {
      console.error("[supabase]", error.message);
      return inMemoryJobs
        .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
        .slice(0, normalizedLimit);
    }
  }

  async getJobEvents(jobId) {
    const inMemory = this.events.get(jobId);
    if (inMemory) {
      return inMemory;
    }

    const persisted = await this.repository.fetchJobEvents(jobId);
    this.events.set(jobId, persisted);
    return persisted;
  }

  async getJobLeads(jobId) {
    const inMemory = this.leads.get(jobId);
    if (inMemory) {
      return [...inMemory.values()].sort((left, right) => {
        return right.createdAt.localeCompare(left.createdAt);
      });
    }

    const persisted = await this.repository.fetchJobLeads(jobId);
    const leadMap = new Map();
    persisted.forEach((lead) => {
      leadMap.set(lead.dedupeKey, lead);
    });
    this.leads.set(jobId, leadMap);
    return persisted;
  }

  async updateJob(jobId, patch) {
    const currentJob = await this.getJob(jobId);
    if (!currentJob) {
      return null;
    }

    const nextJob = {
      ...currentJob,
      ...patch,
      progress: {
        ...currentJob.progress,
        ...(patch.progress || {})
      }
    };

    this.jobs.set(jobId, nextJob);
    this.broadcast(jobId, {
      kind: "job",
      job: nextJob
    });
    await this.persistSafely(() => this.repository.updateJob(nextJob));
    return nextJob;
  }

  async addEvent(jobId, type, message, payload = {}) {
    const event = {
      id: createId(),
      jobId,
      type,
      message,
      payload,
      createdAt: nowIso()
    };

    const jobEvents = this.events.get(jobId) || [];
    jobEvents.push(event);
    this.events.set(jobId, jobEvents);

    this.broadcast(jobId, {
      kind: "event",
      event
    });
    await this.persistSafely(() => this.repository.persistEvent(event));
    return event;
  }

  async upsertLead(jobId, incomingLead) {
    const leadMap = this.leads.get(jobId) || new Map();
    const existingLead = leadMap.get(incomingLead.dedupeKey);
    const mergedLead = existingLead ? mergeLeadRecords(existingLead, incomingLead) : incomingLead;

    leadMap.set(mergedLead.dedupeKey, mergedLead);
    this.leads.set(jobId, leadMap);
    this.broadcast(jobId, {
      kind: "lead",
      lead: mergedLead
    });
    await this.persistSafely(() => this.repository.upsertLead(mergedLead));

    return {
      lead: mergedLead,
      inserted: !existingLead,
      refinedUpgraded: existingLead?.qualityTier !== mergedLead.qualityTier && mergedLead.qualityTier === "refined"
    };
  }

  subscribe(jobId, response) {
    const jobSubscribers = this.subscribers.get(jobId) || new Set();
    jobSubscribers.add(response);
    this.subscribers.set(jobId, jobSubscribers);

    const job = this.jobs.get(jobId);
    if (job) {
      writeSseMessage(response, {
        kind: "job",
        job
      });
    }
  }

  unsubscribe(jobId, response) {
    const jobSubscribers = this.subscribers.get(jobId);
    if (!jobSubscribers) {
      return;
    }

    jobSubscribers.delete(response);
    if (!jobSubscribers.size) {
      this.subscribers.delete(jobId);
    }
  }

  buildLeadStats(jobId) {
    const leadMap = this.leads.get(jobId) || new Map();
    const leads = [...leadMap.values()];
    return {
      savedLeads: leads.length,
      refinedLeads: leads.filter((lead) => lead.qualityTier === "refined").length,
      platformBreakdown: leads.reduce((result, lead) => {
        result[lead.platform] = (result[lead.platform] || 0) + 1;
        return result;
      }, {})
    };
  }

  broadcast(jobId, payload) {
    const jobSubscribers = this.subscribers.get(jobId);
    if (!jobSubscribers?.size) {
      return;
    }

    for (const response of jobSubscribers) {
      writeSseMessage(response, payload);
    }
  }

  async persistSafely(action) {
    try {
      await action();
    } catch (error) {
      console.error("[supabase]", error.message);
    }
  }
}
