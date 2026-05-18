import { getCountryPreset, getIndustryPreset } from "./config.js";
import {
  canonicalizeUrl,
  createId,
  detectPlatformFromUrl,
  mergeUnique,
  safeText,
  uniqueStrings
} from "./utils.js";

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /(?:\+|00)?\d[\d\s().-]{6,}\d/g;

const BUSINESS_SIGNALS = [
  "importador",
  "importadora",
  "importer",
  "distributor",
  "distribuidor",
  "distribuidora",
  "wholesaler",
  "wholesale",
  "dealer",
  "supplier",
  "manufacturer",
  "factory",
  "exporter",
  "atacadista",
  "mayoreo",
  "trade",
  "comercio exterior"
];

const SUPPLIER_SIGNALS = [
  "supplier",
  "manufacturer",
  "factory",
  "exporter",
  "fornecedor",
  "fabricante",
  "whatsapp",
  "seller"
];

const CHINA_SIGNALS = [
  "china",
  "chinese",
  "productos chinos",
  "proveedores chinos",
  "fabricantes chinos",
  "from china",
  "de china",
  "importados da china",
  "importadora china",
  "negocio da china"
];

const IMPORTER_SIGNALS = [
  "import",
  "importer",
  "importador",
  "importadora",
  "importacao",
  "importacion",
  "distribution",
  "distributor",
  "distribuidor",
  "distribuidora",
  "trade",
  "wholesale",
  "comercio exterior"
];

const NOISE_SIGNALS = [
  "restaurant",
  "restaurante",
  "food",
  "school",
  "academy",
  "church",
  "travel",
  "lawyer",
  "clinic",
  "real estate",
  "music",
  "embassy",
  "education"
];

export function extractLeadCandidates(result, job) {
  const title = safeText(result.title);
  const summary = safeText(result.description || result.snippet);
  const extraSnippets = Array.isArray(result.extraSnippets) ? result.extraSnippets : [];
  const searchableText = [title, summary, ...extraSnippets].filter(Boolean).join(" ");
  const phones = extractPhonesFromText(searchableText, job.phoneCode);

  if (!phones.length) {
    return [];
  }

  const signals = detectSignals(searchableText, job);
  const emails = extractEmails(searchableText);
  const canonicalUrl = canonicalizeUrl(result.url);
  const platform = job.platforms?.includes(result.platform) ? result.platform : detectPlatformFromUrl(result.url);

  return phones.map((phone) => {
    const evaluation = evaluateLead({
      phone,
      signals,
      job
    });

    return {
      id: createId(),
      jobId: job.id,
      dedupeKey: `${canonicalUrl}::${phone}`,
      queryText: result.queryText,
      matchedQueries: [result.queryText],
      platform,
      sourceUrl: result.url,
      canonicalUrl,
      title,
      summary,
      phone,
      emails,
      matchedKeywords: uniqueStrings([
        ...signals.business,
        ...signals.supplier,
        ...signals.importer,
        ...signals.china,
        ...signals.industry
      ]),
      qualityTier: evaluation.qualityTier,
      confidence: evaluation.confidence,
      country: job.country || "",
      city: job.city || "",
      industryGroup: job.industryGroup || "",
      poolType: job.poolType,
      rawResult: {
        rank: result.rank,
        extraSnippets,
        detectedSignals: signals
      },
      createdAt: new Date().toISOString()
    };
  });
}

export function mergeLeadRecords(existingLead, incomingLead) {
  const mergedKeywords = mergeUnique(existingLead.matchedKeywords, incomingLead.matchedKeywords);
  const mergedQueries = mergeUnique(existingLead.matchedQueries, incomingLead.matchedQueries);
  const mergedEmails = mergeUnique(existingLead.emails, incomingLead.emails);
  const upgradedQualityTier = rankQuality(existingLead.qualityTier) >= rankQuality(incomingLead.qualityTier)
    ? existingLead.qualityTier
    : incomingLead.qualityTier;
  const upgradedConfidence = rankConfidence(existingLead.confidence) >= rankConfidence(incomingLead.confidence)
    ? existingLead.confidence
    : incomingLead.confidence;
  const richerSummary = existingLead.summary.length >= incomingLead.summary.length ? existingLead.summary : incomingLead.summary;
  const richerTitle = existingLead.title.length >= incomingLead.title.length ? existingLead.title : incomingLead.title;

  return {
    ...existingLead,
    title: richerTitle,
    summary: richerSummary,
    emails: mergedEmails,
    matchedKeywords: mergedKeywords,
    matchedQueries: mergedQueries,
    qualityTier: upgradedQualityTier,
    confidence: upgradedConfidence,
    rawResult: {
      ...existingLead.rawResult,
      ...incomingLead.rawResult
    }
  };
}

function extractPhonesFromText(text, phoneCode) {
  const rawMatches = text.match(PHONE_REGEX) || [];
  const normalizedMatches = rawMatches
    .map((match) => normalizePhone(match, phoneCode))
    .filter(Boolean);

  return uniqueStrings(normalizedMatches);
}

function extractEmails(text) {
  return uniqueStrings(text.match(EMAIL_REGEX) || []);
}

function normalizePhone(rawPhone, phoneCode) {
  const cleaned = safeText(rawPhone)
    .replace(/(?:ext|x)\s*\d+$/i, "")
    .replace(/\s+/g, "")
    .replace(/[().-]/g, "");

  if (!cleaned) {
    return "";
  }

  let normalized = cleaned.startsWith("00") ? `+${cleaned.slice(2)}` : cleaned;
  normalized = normalized.replace(/(?!^\+)[^\d]/g, "");

  if (!normalized.startsWith("+")) {
    const digitsOnly = normalized.replace(/\D/g, "");
    const codeDigits = safeText(phoneCode).replace(/\D/g, "");

    if (!digitsOnly) {
      return "";
    }

    if (codeDigits && digitsOnly.startsWith(codeDigits)) {
      normalized = `+${digitsOnly}`;
    } else if (codeDigits && digitsOnly.length >= 7 && digitsOnly.length <= 13) {
      normalized = `+${codeDigits}${digitsOnly.replace(/^0+/, "")}`;
    } else {
      normalized = `+${digitsOnly}`;
    }
  }

  const digitCount = normalized.replace(/\D/g, "").length;
  if (digitCount < 7 || digitCount > 15) {
    return "";
  }

  return normalized;
}

function detectSignals(text, job) {
  const haystack = safeText(text).toLowerCase();
  const countryPreset = getCountryPreset(job.country);
  const industryPreset = getIndustryPreset(job.industryGroup);

  const industrySignals = industryPreset?.keywords || [];
  const chinaSignals = uniqueStrings([...(countryPreset?.chinaPhrases || []), ...CHINA_SIGNALS]);
  const importerSignals = uniqueStrings([...(countryPreset?.importerPhrases || []), ...IMPORTER_SIGNALS]);
  const supplierSignals = uniqueStrings([...(countryPreset?.supplierRoles || []), ...SUPPLIER_SIGNALS]);
  const businessSignals = uniqueStrings([...(countryPreset?.localRoles || []), ...BUSINESS_SIGNALS]);

  return {
    business: findMatches(haystack, businessSignals),
    supplier: findMatches(haystack, supplierSignals),
    china: findMatches(haystack, chinaSignals),
    importer: findMatches(haystack, importerSignals),
    industry: findMatches(haystack, industrySignals),
    noise: findMatches(haystack, NOISE_SIGNALS)
  };
}

function evaluateLead({ phone, signals, job }) {
  const matchesPhoneCode = !job.phoneCode || phone.startsWith(job.phoneCode.replace(/\s+/g, ""));
  const isChinaPool = job.poolType === "china_supplier";
  const isRefinedForLocal = matchesPhoneCode && (signals.business.length > 0 || signals.industry.length > 0) && signals.noise.length === 0;
  const isRefinedForChinaSupplier = phone.startsWith("+86") && signals.supplier.length > 0 && signals.industry.length > 0 && signals.noise.length === 0;
  const isRefinedForMerchant = matchesPhoneCode && signals.china.length > 0 && (signals.business.length > 0 || signals.industry.length > 0) && signals.noise.length === 0;
  const isRefinedForImporter = matchesPhoneCode && signals.china.length > 0 && signals.importer.length > 0 && signals.noise.length === 0;

  const qualityTier = determineQualityTier({
    poolType: job.poolType,
    local: isRefinedForLocal,
    supplier: isRefinedForChinaSupplier,
    merchant: isRefinedForMerchant,
    importer: isRefinedForImporter
  });

  const signalGroupCount = [
    signals.business.length,
    signals.supplier.length,
    signals.importer.length,
    signals.china.length,
    signals.industry.length
  ].filter((value) => value > 0).length;

  const confidence = qualityTier === "refined"
    ? signalGroupCount >= 3
      ? "high"
      : "medium"
    : isChinaPool && !phone.startsWith("+86")
      ? "low"
      : signalGroupCount >= 2
        ? "medium"
        : "low";

  return {
    qualityTier,
    confidence
  };
}

function determineQualityTier(flags) {
  if (flags.poolType === "china_supplier") {
    return flags.supplier ? "refined" : "broad";
  }

  if (flags.poolType === "chinese_merchant") {
    return flags.merchant ? "refined" : "broad";
  }

  if (flags.poolType === "importer") {
    return flags.importer ? "refined" : "broad";
  }

  return flags.local ? "refined" : "broad";
}

function findMatches(haystack, keywords) {
  return uniqueStrings((keywords || []).filter((keyword) => {
    return safeText(keyword) && haystack.includes(safeText(keyword).toLowerCase());
  }));
}

function rankQuality(tier) {
  return tier === "refined" ? 2 : 1;
}

function rankConfidence(confidence) {
  if (confidence === "high") {
    return 3;
  }

  if (confidence === "medium") {
    return 2;
  }

  return 1;
}
