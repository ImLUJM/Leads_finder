const BRAVE_WEB_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

export class BraveClient {
  constructor(config) {
    this.apiKey = config.braveApiKey;
    this.defaultCountry = config.braveCountry;
    this.defaultSearchLang = config.defaultSearchLang;
    this.resultCount = config.resultCount;
    this.requestTimeoutMs = config.requestTimeoutMs;
    this.proxyConfigured = config.proxyConfigured;
    this.proxyEnabled = config.proxyEnabled;
  }

  get isConfigured() {
    return Boolean(this.apiKey);
  }

  get transport() {
    if (this.proxyEnabled) {
      return "proxy";
    }

    if (this.proxyConfigured) {
      return "proxy-not-enabled";
    }

    return "direct";
  }

  async search({ query, country, searchLanguage, offset = 0, signal }) {
    const requestUrl = new URL(BRAVE_WEB_ENDPOINT);
    requestUrl.searchParams.set("q", query);
    requestUrl.searchParams.set("count", String(this.resultCount));
    requestUrl.searchParams.set("country", country || this.defaultCountry);
    requestUrl.searchParams.set("search_lang", searchLanguage || this.defaultSearchLang);
    requestUrl.searchParams.set("offset", String(offset));

    const timeoutSignal = AbortSignal.timeout(this.requestTimeoutMs);
    const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    let response;

    try {
      response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": this.apiKey
        },
        signal: requestSignal
      });
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }

      return {
        ok: false,
        status: 0,
        data: {
          message: appendTransportHint(error.name === "TimeoutError"
            ? `Brave request timed out after ${this.requestTimeoutMs}ms`
            : error.message || "Brave request failed", this.transport)
        },
        results: [],
        headers: {
          rateLimitRemaining: null,
          rateLimitReset: null
        }
      };
    }

    const text = await response.text();
    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {
        raw: text
      };
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      results: normalizeBraveResults(data),
      headers: {
        rateLimitRemaining: response.headers.get("x-ratelimit-remaining"),
        rateLimitReset: response.headers.get("x-ratelimit-reset")
      }
    };
  }
}

function appendTransportHint(message, transport) {
  if (transport === "proxy") {
    return `${message} (configured proxy connection)`;
  }

  if (transport === "proxy-not-enabled") {
    return `${message} (proxy URL exists, but the server was not started with npm start)`;
  }

  return `${message} (direct connection; configure HTTPS_PROXY if Brave is unreachable)`;
}

export function normalizeBraveResults(data) {
  const results = data?.web?.results || data?.results || [];
  return results.map((item, index) => ({
    rank: index + 1,
    title: item.title || item.name || "",
    url: item.url || item.profile?.url || "",
    description: item.description || item.snippet || item.meta_description || "",
    extraSnippets: Array.isArray(item.extra_snippets) ? item.extra_snippets : []
  }));
}

export function getBraveErrorMessage(response) {
  const errorBody = response?.data?.error || response?.data || {};
  const detail = stringOrEmpty(errorBody.detail || errorBody.message || response?.data?.detail || response?.data?.message);
  const validationSummary = formatValidationErrors(errorBody.meta?.errors);

  if (detail && validationSummary) {
    return `${detail} (${validationSummary})`;
  }

  if (detail) {
    return detail;
  }

  if (validationSummary) {
    return validationSummary;
  }

  return `Brave request failed with status ${response?.status || "unknown"}`;
}

export function isQuotaLimited(response) {
  const errorBody = response?.data?.error || response?.data || {};
  const code = String(errorBody.code || response?.data?.code || "").toUpperCase();
  const detail = String(errorBody.detail || errorBody.message || response?.data?.detail || response?.data?.message || "")
    .toLowerCase();

  return response?.status === 429 && (code === "QUOTA_LIMITED" || detail.includes("quota"));
}

function formatValidationErrors(errors) {
  if (!Array.isArray(errors) || !errors.length) {
    return "";
  }

  return errors
    .map((error) => {
      const location = Array.isArray(error?.loc) ? error.loc.join(".") : "";
      const message = stringOrEmpty(error?.msg);
      const input = stringOrEmpty(error?.input);
      const parts = [location, message].filter(Boolean);
      if (input) {
        parts.push(`input=${input}`);
      }
      return parts.join(" ");
    })
    .filter(Boolean)
    .join("; ");
}

function stringOrEmpty(value) {
  return typeof value === "string" ? value.trim() : "";
}
