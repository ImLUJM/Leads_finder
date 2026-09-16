import { mergeUnique, safeText } from "./utils.js";

export class SupabaseRepository {
  constructor(config) {
    this.url = normalizeSupabaseUrl(config.supabaseUrl);
    this.serviceRoleKey = safeText(config.supabaseServiceRoleKey);
    this.requestTimeoutMs = config.requestTimeoutMs;
    this.leadSchemaMode = "";
  }

  get isConfigured() {
    return Boolean(this.url && this.serviceRoleKey);
  }

  async checkHealth() {
    if (!this.isConfigured) {
      return {
        configured: false,
        state: "missing",
        message: "Supabase is not configured"
      };
    }

    try {
      await this.request("GET", "/lead_search_jobs?select=id&limit=1");
      return {
        configured: true,
        state: "ready",
        message: ""
      };
    } catch (error) {
      return {
        configured: true,
        state: "error",
        message: error.message || "Supabase connection failed"
      };
    }
  }

  async persistJob(job) {
    if (!this.isConfigured) {
      return;
    }

    await this.request("POST", "/lead_search_jobs", {
      body: jobToRow(job),
      headers: {
        Prefer: "return=minimal"
      }
    });
  }

  async updateJob(job) {
    if (!this.isConfigured) {
      return;
    }

    await this.request("PATCH", `/lead_search_jobs?id=eq.${job.id}`, {
      body: jobToRow(job),
      headers: {
        Prefer: "return=minimal"
      }
    });
  }

  async persistEvent(event) {
    if (!this.isConfigured) {
      return;
    }

    await this.request("POST", "/lead_search_job_events", {
      body: eventToRow(event),
      headers: {
        Prefer: "return=minimal"
      }
    });
  }

  async upsertLead(lead) {
    if (!this.isConfigured) {
      return;
    }

    const schemaMode = await this.getLeadSchemaMode();
    if (schemaMode === "legacy") {
      await this.request("POST", "/leads?on_conflict=dedupe_key", {
        body: legacyLeadToRow(lead),
        headers: {
          Prefer: "resolution=merge-duplicates,return=minimal"
        }
      });
      return;
    }

    const globalLead = await this.upsertGlobalLead(lead);

    await this.request("POST", "/job_leads?on_conflict=job_id,lead_id", {
      body: jobLeadToRow(lead, globalLead.id),
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal"
      }
    });
  }

  async fetchJob(jobId) {
    if (!this.isConfigured) {
      return null;
    }

    const rows = await this.request("GET", `/lead_search_jobs?id=eq.${jobId}&select=*`);
    return rows.length ? rowToJob(rows[0]) : null;
  }

  async fetchJobs(limit = 12) {
    if (!this.isConfigured) {
      return [];
    }

    const normalizedLimit = Math.max(1, Math.min(50, Number(limit) || 12));
    const rows = await this.request(
      "GET",
      `/lead_search_jobs?select=*&order=created_at.desc&limit=${normalizedLimit}`
    );
    return rows.map(rowToJob);
  }

  async fetchJobEvents(jobId) {
    if (!this.isConfigured) {
      return [];
    }

    const rows = await this.request(
      "GET",
      `/lead_search_job_events?job_id=eq.${jobId}&select=*&order=created_at.asc`
    );
    return rows.map(rowToEvent);
  }

  async fetchJobLeads(jobId) {
    if (!this.isConfigured) {
      return [];
    }

    const schemaMode = await this.getLeadSchemaMode();
    if (schemaMode === "legacy") {
      const legacyRows = await this.request(
        "GET",
        `/leads?job_id=eq.${jobId}&select=*&order=created_at.desc`
      );
      return legacyRows.map(rowToLegacyLead);
    }

    const jobLeadRows = await this.request(
      "GET",
      `/job_leads?job_id=eq.${jobId}&select=*&order=created_at.desc`
    );

    if (!jobLeadRows.length) {
      return [];
    }

    const leadIds = [...new Set(jobLeadRows.map((row) => safeText(row.lead_id)).filter(Boolean))];
    const encodedLeadIds = encodeURIComponent(`(${leadIds.join(",")})`);
    const globalLeadRows = await this.request(
      "GET",
      `/leads?id=in.${encodedLeadIds}&select=*`
    );
    const globalLeadMap = new Map(globalLeadRows.map((row) => [row.id, row]));

    return jobLeadRows
      .map((row) => {
        return rowToLead(row, globalLeadMap.get(row.lead_id));
      })
      .filter(Boolean);
  }

  async upsertGlobalLead(lead) {
    const existingRows = await this.request(
      "GET",
      `/leads?dedupe_key=eq.${encodeURIComponent(lead.dedupeKey)}&select=*`
    );
    const existingRow = existingRows[0];
    const payload = mergeGlobalLeadRow(existingRow, lead);

    if (existingRow?.id) {
      const updatedRows = await this.request("PATCH", `/leads?id=eq.${existingRow.id}`, {
        body: payload,
        headers: {
          Prefer: "return=representation"
        }
      });
      return updatedRows[0] || {
        id: existingRow.id,
        ...payload
      };
    }

    const createdRows = await this.request("POST", "/leads", {
      body: payload,
      headers: {
        Prefer: "return=representation"
      }
    });

    if (!createdRows[0]?.id) {
      throw new Error("Supabase global lead upsert failed: missing lead id");
    }

    return createdRows[0];
  }

  async getLeadSchemaMode() {
    if (this.leadSchemaMode) {
      return this.leadSchemaMode;
    }

    try {
      await this.request("GET", "/job_leads?select=id&limit=1");
      this.leadSchemaMode = "relational";
      return this.leadSchemaMode;
    } catch (error) {
      if (isMissingTableError(error, "job_leads")) {
        this.leadSchemaMode = "legacy";
        return this.leadSchemaMode;
      }

      throw error;
    }
  }

  async request(method, path, { body, headers } = {}) {
    const response = await fetch(`${this.url}/rest/v1${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        ...(headers || {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.requestTimeoutMs)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase request failed: ${response.status} ${text}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return [];
    }

    return response.json();
  }
}

function normalizeSupabaseUrl(rawUrl) {
  const value = safeText(rawUrl).replace(/\/+$/, "");
  if (!value) {
    return "";
  }

  return value.endsWith("/rest/v1") ? value.slice(0, -"/rest/v1".length) : value;
}

function jobToRow(job) {
  return {
    id: job.id,
    status: job.status,
    search_term: job.searchTerm,
    phone_code: job.phoneCode,
    country: job.country || null,
    city: job.city || null,
    industry_group: job.industryGroup || null,
    pool_type: job.poolType,
    query_mode: job.queryMode,
    platforms: job.platforms,
    query_plan: job.queryPlan,
    input_payload: job.inputPayload,
    query_count: job.queryCount,
    total_queries: job.totalQueries,
    completed_queries: job.completedQueries,
    success_queries: job.successQueries,
    failed_queries: job.failedQueries,
    saved_leads: job.savedLeads,
    refined_leads: job.refinedLeads,
    current_query: job.currentQuery || null,
    progress: job.progress,
    last_error: job.lastError || null,
    started_at: job.startedAt || null,
    completed_at: job.completedAt || null,
    created_at: job.createdAt
  };
}

function eventToRow(event) {
  return {
    id: event.id,
    job_id: event.jobId,
    type: event.type,
    message: event.message,
    payload: event.payload,
    created_at: event.createdAt
  };
}

function jobLeadToRow(lead, leadId) {
  return {
    job_id: lead.jobId,
    lead_id: leadId,
    query_text: lead.queryText,
    matched_queries: lead.matchedQueries,
    matched_keywords: lead.matchedKeywords,
    quality_tier: lead.qualityTier,
    confidence: lead.confidence,
    country: lead.country || null,
    city: lead.city || null,
    industry_group: lead.industryGroup || null,
    pool_type: lead.poolType || null,
    raw_result: lead.rawResult,
    created_at: lead.createdAt
  };
}

function legacyLeadToRow(lead) {
  return {
    id: lead.id,
    job_id: lead.jobId,
    dedupe_key: lead.dedupeKey,
    query_text: lead.queryText,
    matched_queries: lead.matchedQueries,
    platform: lead.platform,
    source_url: lead.sourceUrl,
    canonical_url: lead.canonicalUrl,
    title: lead.title,
    summary: lead.summary,
    phone: lead.phone,
    emails: lead.emails,
    matched_keywords: lead.matchedKeywords,
    quality_tier: lead.qualityTier,
    confidence: lead.confidence,
    country: lead.country || null,
    city: lead.city || null,
    industry_group: lead.industryGroup || null,
    pool_type: lead.poolType || null,
    raw_result: lead.rawResult,
    created_at: lead.createdAt
  };
}

function rowToJob(row) {
  const inputPayload = row.input_payload || {};
  return {
    id: row.id,
    status: row.status,
    searchTerm: row.search_term,
    phoneCode: row.phone_code,
    country: row.country || "",
    city: row.city || "",
    cities: inputPayload.cities || splitStoredCities(row.city),
    industryGroup: row.industry_group || "",
    categorySelection: inputPayload.categorySelection || null,
    poolType: row.pool_type,
    queryMode: row.query_mode,
    platforms: row.platforms || [],
    queryPlan: row.query_plan || [],
    inputPayload,
    queryCount: row.query_count,
    totalQueries: row.total_queries,
    completedQueries: row.completed_queries,
    successQueries: row.success_queries,
    failedQueries: row.failed_queries,
    savedLeads: row.saved_leads,
    refinedLeads: row.refined_leads,
    currentQuery: row.current_query || "",
    progress: row.progress || {},
    lastError: row.last_error || "",
    startedAt: row.started_at || "",
    completedAt: row.completed_at || "",
    createdAt: row.created_at
  };
}

function splitStoredCities(value) {
  return safeText(value)
    .split(/\s*\/\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function rowToEvent(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    type: row.type,
    message: row.message,
    payload: row.payload || {},
    createdAt: row.created_at
  };
}

function rowToLead(jobLeadRow, globalLeadRow) {
  if (!globalLeadRow) {
    return null;
  }

  return {
    id: globalLeadRow.id,
    jobLeadId: jobLeadRow.id,
    leadId: globalLeadRow.id,
    jobId: jobLeadRow.job_id,
    dedupeKey: globalLeadRow.dedupe_key,
    queryText: jobLeadRow.query_text,
    matchedQueries: jobLeadRow.matched_queries || [],
    platform: globalLeadRow.platform,
    sourceUrl: globalLeadRow.source_url,
    canonicalUrl: globalLeadRow.canonical_url,
    title: globalLeadRow.title,
    summary: globalLeadRow.summary,
    phone: globalLeadRow.phone,
    emails: globalLeadRow.emails || [],
    matchedKeywords: jobLeadRow.matched_keywords || [],
    qualityTier: jobLeadRow.quality_tier,
    confidence: jobLeadRow.confidence,
    country: jobLeadRow.country || "",
    city: jobLeadRow.city || "",
    industryGroup: jobLeadRow.industry_group || "",
    poolType: jobLeadRow.pool_type || "",
    rawResult: jobLeadRow.raw_result || {},
    createdAt: jobLeadRow.created_at
  };
}

function rowToLegacyLead(row) {
  return {
    id: row.id,
    leadId: row.id,
    jobId: row.job_id,
    dedupeKey: row.dedupe_key,
    queryText: row.query_text,
    matchedQueries: row.matched_queries || [],
    platform: row.platform,
    sourceUrl: row.source_url,
    canonicalUrl: row.canonical_url,
    title: row.title,
    summary: row.summary,
    phone: row.phone,
    emails: row.emails || [],
    matchedKeywords: row.matched_keywords || [],
    qualityTier: row.quality_tier,
    confidence: row.confidence,
    country: row.country || "",
    city: row.city || "",
    industryGroup: row.industry_group || "",
    poolType: row.pool_type || "",
    rawResult: row.raw_result || {},
    createdAt: row.created_at
  };
}

function mergeGlobalLeadRow(existingRow, lead) {
  const existingTitle = safeText(existingRow?.title);
  const existingSummary = safeText(existingRow?.summary);
  const existingEmails = Array.isArray(existingRow?.emails) ? existingRow.emails : [];

  return {
    dedupe_key: lead.dedupeKey,
    platform: safeText(lead.platform) || safeText(existingRow?.platform),
    source_url: safeText(lead.sourceUrl) || safeText(existingRow?.source_url),
    canonical_url: safeText(lead.canonicalUrl) || safeText(existingRow?.canonical_url),
    title: pickRicherText(existingTitle, lead.title),
    summary: pickRicherText(existingSummary, lead.summary),
    phone: safeText(lead.phone) || safeText(existingRow?.phone),
    emails: mergeUnique(existingEmails, lead.emails),
    created_at: existingRow?.created_at || lead.createdAt
  };
}

function pickRicherText(leftValue, rightValue) {
  const leftText = safeText(leftValue);
  const rightText = safeText(rightValue);

  return leftText.length >= rightText.length ? leftText : rightText;
}

function isMissingTableError(error, tableName) {
  const message = safeText(error?.message).toLowerCase();
  return message.includes("404") && message.includes(safeText(tableName).toLowerCase());
}
