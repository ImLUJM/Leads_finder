import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  COUNTRY_PRESETS,
  INDUSTRY_PRESETS,
  PLATFORM_OPTIONS,
  POOL_TYPES,
  getAppConfig
} from "./src/config.js";
import { BraveClient } from "./src/brave-client.js";
import { getCategoryTree } from "./src/category-taxonomy.js";
import { JobStore } from "./src/job-store.js";
import { buildQueryPlan, normalizeSearchPayload } from "./src/query-builder.js";
import { SearchPipeline } from "./src/search-pipeline.js";
import { STRUCTURED_EXPORT_HEADERS, buildStructuredLeadRow, sortStructuredLeadRows } from "./src/structured-output.js";
import { SupabaseRepository } from "./src/supabase.js";
import {
  badRequest,
  buildCsv,
  internalError,
  notFound,
  readJsonBody,
  sendJson,
  sendSseHeaders
} from "./src/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const config = getAppConfig();
const recentJobStarts = [];
let supabaseHealthCache = {
  value: null,
  expiresAt: 0
};

const braveClient = new BraveClient(config);
const repository = new SupabaseRepository(config);
const store = new JobStore(repository);
const pipeline = new SearchPipeline({
  braveClient,
  store,
  requestDelayMs: config.requestDelayMs
});

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", config.baseUrl);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  try {
    if (requestUrl.pathname.startsWith("/api/")) {
      await handleApiRequest(request, response, requestUrl);
      return;
    }

    await serveStaticFile(response, requestUrl.pathname);
  } catch (error) {
    console.error(error);
    internalError(response, error.message || "Service error");
  }
});

server.listen(config.port, () => {
  console.log(`International leads finder listening on :${config.port}`);
});

async function handleApiRequest(request, response, requestUrl) {
  if (request.method === "GET" && requestUrl.pathname === "/api/health") {
    const braveHealth = pipeline.getBraveHealth();
    const supabaseHealth = await getSupabaseHealth();

    sendJson(response, 200, {
      ok: true,
      braveConfigured: braveClient.isConfigured,
      supabaseConfigured: repository.isConfigured,
      providers: {
        brave: braveHealth,
        supabase: supabaseHealth
      },
      limits: {
        activeJobs: pipeline.getActiveJobCount(),
        maxConcurrentJobs: config.maxConcurrentJobs,
        startsPerWindow: config.jobRateLimit,
        windowMs: config.jobRateWindowMs
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/options") {
    sendJson(response, 200, {
      platforms: PLATFORM_OPTIONS,
      poolTypes: POOL_TYPES,
      industries: INDUSTRY_PRESETS,
      categoryTaxonomy: getCategoryTree(),
      countries: Object.values(COUNTRY_PRESETS).map((preset) => ({
        country: preset.country,
        chineseName: preset.chineseName,
        countryCode: preset.countryCode,
        braveCountry: preset.braveCountry,
        defaultPhoneCode: preset.defaultPhoneCode,
        defaultSearchLang: preset.defaultSearchLang,
        cities: preset.cities || []
      }))
    });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/jobs") {
    const requestedLimit = Number(requestUrl.searchParams.get("limit") || 12);
    const limit = Math.max(1, Math.min(50, Number.isFinite(requestedLimit) ? requestedLimit : 12));
    const jobs = await store.listJobs(limit);

    sendJson(response, 200, {
      jobs
    });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/jobs") {
    let payload;
    let normalizedInput;

    try {
      payload = await readJsonBody(request);
      normalizedInput = normalizeSearchPayload(payload);
    } catch (error) {
      badRequest(response, error.message || "Invalid search configuration");
      return;
    }

    const admission = checkJobAdmission();
    if (!admission.allowed) {
      sendRateLimitResponse(response, admission);
      return;
    }

    const queryPlan = buildQueryPlan(normalizedInput);
    const job = await store.createJob(normalizedInput, queryPlan);

    await store.addEvent(job.id, "job.queued", "Job created and queued.", {
      queryCount: queryPlan.length
    });

    recentJobStarts.push(Date.now());
    pipeline.runJob(job.id).catch((error) => {
      console.error(error);
    });

    sendJson(response, 202, {
      job,
      braveConfigured: braveClient.isConfigured,
      supabaseConfigured: repository.isConfigured
    });
    return;
  }

  const jobIdMatch = requestUrl.pathname.match(/^\/api\/jobs\/([^/]+)(?:\/([^/]+))?$/);
  if (!jobIdMatch) {
    notFound(response);
    return;
  }

  const jobId = jobIdMatch[1];
  const suffix = jobIdMatch[2] || "";
  const job = await store.getJob(jobId);

  if (!job) {
    notFound(response);
    return;
  }

  if (request.method === "GET" && !suffix) {
    sendJson(response, 200, {
      job
    });
    return;
  }

  if (request.method === "GET" && suffix === "events") {
    const events = await store.getJobEvents(jobId);
    sendJson(response, 200, {
      events
    });
    return;
  }

  if (request.method === "GET" && suffix === "leads") {
    const leads = await store.getJobLeads(jobId);
    const qualityTier = requestUrl.searchParams.get("qualityTier");
    const filteredLeads = qualityTier
      ? leads.filter((lead) => lead.qualityTier === qualityTier)
      : leads;

    sendJson(response, 200, {
      leads: filteredLeads
    });
    return;
  }

  if (request.method === "GET" && suffix === "stream") {
    sendSseHeaders(response);
    store.subscribe(jobId, response);

    request.on("close", () => {
      store.unsubscribe(jobId, response);
    });
    return;
  }

  if (request.method === "POST" && suffix === "cancel") {
    const cancelled = await pipeline.cancelJob(jobId);
    sendJson(response, 200, {
      cancelled
    });
    return;
  }

  if (request.method === "GET" && suffix === "export.csv") {
    const leads = await store.getJobLeads(jobId);
    const qualityTier = requestUrl.searchParams.get("qualityTier");
    const filteredLeads = qualityTier ? leads.filter((lead) => lead.qualityTier === qualityTier) : leads;
    const structuredRows = sortStructuredLeadRows(
      filteredLeads.map((lead) => {
        return buildStructuredLeadRow(lead);
      })
    );
    const hydratedCsv = buildCsv(
      structuredRows,
      STRUCTURED_EXPORT_HEADERS
    );

    response.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${jobId}-structured.csv"`
    });
    response.end(`\uFEFF${hydratedCsv}`);
    return;
  }

  badRequest(response, "Unsupported endpoint");
}

function checkJobAdmission() {
  const now = Date.now();
  const windowStart = now - config.jobRateWindowMs;

  while (recentJobStarts.length && recentJobStarts[0] < windowStart) {
    recentJobStarts.shift();
  }

  if (pipeline.getActiveJobCount() >= config.maxConcurrentJobs) {
    return {
      allowed: false,
      message: `当前已有 ${config.maxConcurrentJobs} 个任务在执行，请稍后再试。`,
      retryAfterSeconds: 5
    };
  }

  if (recentJobStarts.length >= config.jobRateLimit) {
    const retryAt = recentJobStarts[0] + config.jobRateWindowMs;
    return {
      allowed: false,
      message: `任务创建过于频繁，每 ${Math.round(config.jobRateWindowMs / 1000)} 秒最多创建 ${config.jobRateLimit} 个任务。`,
      retryAfterSeconds: Math.max(1, Math.ceil((retryAt - now) / 1000))
    };
  }

  return {
    allowed: true
  };
}

function sendRateLimitResponse(response, admission) {
  response.writeHead(429, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Retry-After": String(admission.retryAfterSeconds || 5)
  });
  response.end(JSON.stringify({
    error: "rate_limited",
    message: admission.message,
    retryAfterSeconds: admission.retryAfterSeconds || 5
  }));
}

async function getSupabaseHealth() {
  const now = Date.now();
  if (supabaseHealthCache.value && supabaseHealthCache.expiresAt > now) {
    return supabaseHealthCache.value;
  }

  const health = await repository.checkHealth();
  const value = {
    ...health,
    checkedAt: new Date().toISOString()
  };

  supabaseHealthCache = {
    value,
    expiresAt: now + 30_000
  };

  return value;
}

async function serveStaticFile(response, pathname) {
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const absolutePath = path.normalize(path.join(publicDir, normalizedPath));

  if (!absolutePath.startsWith(publicDir)) {
    notFound(response);
    return;
  }

  try {
    const file = await readFile(absolutePath);
    const extension = path.extname(absolutePath);
    const contentType = getContentType(extension);

    response.writeHead(200, {
      "Content-Type": contentType
    });
    response.end(file);
  } catch {
    notFound(response);
  }
}

function getContentType(extension) {
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}
