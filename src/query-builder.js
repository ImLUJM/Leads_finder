import {
  PLATFORM_OPTIONS,
  POOL_TYPES,
  getAppConfig,
  normalizeBraveCountry,
  normalizeBraveLanguage,
  getCountryPreset,
  getIndustryPreset,
  getPlatform
} from "./config.js";
import { createId, safeText, uniqueStrings } from "./utils.js";

const GLOBAL_LOCAL_ROLES = [
  "importer",
  "distributor",
  "wholesaler",
  "dealer",
  "trade"
];

const GLOBAL_SUPPLIER_ROLES = [
  "supplier",
  "manufacturer",
  "factory",
  "exporter",
  "whatsapp"
];

const GLOBAL_CHINA_PHRASES = [
  "china",
  "from china",
  "chinese business",
  "import from china"
];

const GLOBAL_IMPORTER_PHRASES = [
  "import",
  "wholesale",
  "distribution",
  "trade"
];

export function getFormOptions() {
  return {
    platforms: PLATFORM_OPTIONS,
    poolTypes: POOL_TYPES
  };
}

export function normalizeSearchPayload(payload = {}) {
  const appConfig = getAppConfig();
  const country = safeText(payload.country);
  const countryPreset = getCountryPreset(country);
  const industryGroup = safeText(payload.industryGroup);
  const industryPreset = getIndustryPreset(industryGroup);
  const poolType = POOL_TYPES.some((item) => item.id === payload.poolType) ? payload.poolType : "local_customer";
  const searchTerm = safeText(payload.searchTerm);

  if (!searchTerm) {
    throw new Error("Search term is required");
  }

  const platformIds = uniqueStrings(payload.platforms || ["facebook"])
    .map((platformId) => getPlatform(platformId)?.id)
    .filter(Boolean);

  if (!platformIds.length) {
    throw new Error("Select at least one platform");
  }

  const rawPhoneCode = safeText(payload.phoneCode || countryPreset?.defaultPhoneCode || "");
  const phoneCode = normalizePhoneCode(rawPhoneCode);

  if (!phoneCode) {
    throw new Error("Phone code is required, for example +55 / +52 / +86");
  }

  const maxQueries = clampNumber(payload.maxQueries, 8, 1, 24);
  const queryMode = safeText(payload.queryMode || "page1_only") || "page1_only";
  const fallbackBraveCountry = normalizeBraveCountry(appConfig.braveCountry, "US");
  const fallbackSearchLanguage = normalizeBraveLanguage(appConfig.defaultSearchLang, "en");

  return {
    searchTerm,
    phoneCode,
    country,
    city: safeText(payload.city),
    industryGroup: industryPreset?.id || "",
    industryLabel: industryPreset?.label || "",
    industryEnglishLabel: industryPreset?.englishLabel || "",
    poolType,
    platforms: platformIds,
    countryPreset,
    industryPreset,
    queryMode,
    maxQueries,
    braveCountry: normalizeBraveCountry(
      payload.braveCountry || countryPreset?.braveCountry || country || fallbackBraveCountry,
      fallbackBraveCountry
    ),
    searchLanguage: normalizeBraveLanguage(
      payload.searchLanguage || countryPreset?.defaultSearchLang || fallbackSearchLanguage,
      fallbackSearchLanguage
    )
  };
}

export function buildQueryPlan(input) {
  const geoTerms = uniqueStrings([
    [input.city, input.country].filter(Boolean).join(" "),
    input.city,
    input.country,
    ...(input.countryPreset?.countryTerms || [])
  ]);

  const topicTerms = uniqueStrings([
    input.searchTerm,
    ...(input.industryPreset?.keywords?.slice(0, 3) || [])
  ]);

  const modifiers = getModifiersForPool(input);
  const queries = [];
  const seen = new Set();

  for (const platformId of input.platforms) {
    const platform = getPlatform(platformId);
    if (!platform) {
      continue;
    }

    for (const geoTerm of geoTerms.length ? geoTerms : [""]) {
      pushQuery({
        seen,
        queries,
        limit: input.maxQueries,
        queryMeta: createQueryMeta({
          platform,
          geoTerm,
          topic: input.searchTerm,
          modifier: "",
          input
        })
      });

      for (const topic of topicTerms) {
        pushQuery({
          seen,
          queries,
          limit: input.maxQueries,
          queryMeta: createQueryMeta({
            platform,
            geoTerm,
            topic,
            modifier: "",
            input
          })
        });

        for (const modifier of modifiers) {
          pushQuery({
            seen,
            queries,
            limit: input.maxQueries,
            queryMeta: createQueryMeta({
              platform,
              geoTerm,
              topic,
              modifier,
              input
            })
          });

          if (queries.length >= input.maxQueries) {
            break;
          }
        }

        if (queries.length >= input.maxQueries) {
          break;
        }
      }

      if (queries.length >= input.maxQueries) {
        break;
      }
    }
  }

  return queries.slice(0, input.maxQueries).map((queryMeta, index) => ({
    ...queryMeta,
    index
  }));
}

function createQueryMeta({ platform, geoTerm, topic, modifier, input }) {
  const parts = [
    `site:${platform.domain}`,
    geoTerm,
    topic,
    modifier,
    `"${input.phoneCode}"`
  ]
    .map((value) => safeText(value))
    .filter(Boolean);

  return {
    id: createId(),
    platformId: platform.id,
    platformDomain: platform.domain,
    geoTerm: safeText(geoTerm),
    topic: safeText(topic),
    modifier: safeText(modifier),
    text: parts.join(" "),
    page: 1
  };
}

function pushQuery({ seen, queries, queryMeta, limit }) {
  if (!queryMeta || queries.length >= limit) {
    return;
  }

  const normalized = queryMeta.text.toLowerCase();
  if (seen.has(normalized)) {
    return;
  }

  seen.add(normalized);
  queries.push(queryMeta);
}

function normalizePhoneCode(rawPhoneCode) {
  const digits = safeText(rawPhoneCode).replace(/[^\d+]/g, "");
  if (!digits) {
    return "";
  }

  if (digits.startsWith("+")) {
    return digits;
  }

  return `+${digits}`;
}

function getModifiersForPool(input) {
  if (input.poolType === "china_supplier") {
    return uniqueStrings([
      ...(input.countryPreset?.supplierRoles || GLOBAL_SUPPLIER_ROLES),
      ...(input.countryPreset?.chinaPhrases?.slice(0, 2) || GLOBAL_CHINA_PHRASES.slice(0, 2))
    ]).slice(0, 5);
  }

  if (input.poolType === "chinese_merchant") {
    return uniqueStrings([
      ...(input.countryPreset?.chinaPhrases || GLOBAL_CHINA_PHRASES),
      ...(input.countryPreset?.localRoles?.slice(0, 2) || GLOBAL_LOCAL_ROLES.slice(0, 2))
    ]).slice(0, 5);
  }

  if (input.poolType === "importer") {
    return uniqueStrings([
      ...(input.countryPreset?.importerPhrases || GLOBAL_IMPORTER_PHRASES),
      ...(input.countryPreset?.chinaPhrases?.slice(0, 2) || GLOBAL_CHINA_PHRASES.slice(0, 2))
    ]).slice(0, 5);
  }

  return uniqueStrings([
    ...(input.countryPreset?.localRoles || GLOBAL_LOCAL_ROLES),
    ...(input.industryPreset?.keywords?.slice(0, 2) || [])
  ]).slice(0, 5);
}

function clampNumber(value, defaultValue, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.max(min, Math.min(max, Math.round(parsed)));
}
