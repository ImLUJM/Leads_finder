import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

loadDotEnv();

const BRAVE_LANGUAGE_CODES = new Set([
  "ar",
  "eu",
  "bn",
  "bg",
  "ca",
  "zh-hans",
  "zh-hant",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "en-gb",
  "et",
  "fi",
  "fr",
  "gl",
  "de",
  "el",
  "gu",
  "he",
  "hi",
  "hu",
  "is",
  "it",
  "jp",
  "kn",
  "ko",
  "lv",
  "lt",
  "ms",
  "ml",
  "mr",
  "nb",
  "pl",
  "pt-br",
  "pt-pt",
  "pa",
  "ro",
  "ru",
  "sr",
  "sk",
  "sl",
  "es",
  "sv",
  "ta",
  "te",
  "th",
  "tr",
  "uk",
  "vi"
]);

const BRAVE_LANGUAGE_ALIASES = {
  pt: "pt-br",
  pt_br: "pt-br",
  ptbr: "pt-br",
  "pt-br": "pt-br",
  "pt-pt": "pt-pt",
  zh: "zh-hans",
  "zh-cn": "zh-hans",
  zh_hans: "zh-hans",
  "zh-hans": "zh-hans",
  "zh-tw": "zh-hant",
  zh_hant: "zh-hant",
  "zh-hant": "zh-hant",
  en_us: "en",
  "en-us": "en",
  en_uk: "en-gb",
  "en-uk": "en-gb"
};

const BRAVE_COUNTRY_ALIASES = {
  brazil: "BR",
  brasil: "BR",
  br: "BR",
  mexico: "MX",
  "méxico": "MX",
  mx: "MX",
  "united states": "US",
  usa: "US",
  us: "US",
  china: "CN",
  cn: "CN"
};

export const PLATFORM_OPTIONS = [
  {
    id: "facebook",
    label: "Facebook",
    domain: "facebook.com"
  },
  {
    id: "instagram",
    label: "Instagram",
    domain: "instagram.com"
  }
];

export const POOL_TYPES = [
  {
    id: "local_customer",
    label: "\u672c\u5730\u5ba2\u6237\u6c60",
    description: "\u672c\u5730\u8fdb\u53e3\u5546\u3001\u6279\u53d1\u5546\u3001\u7ecf\u9500\u5546"
  },
  {
    id: "china_supplier",
    label: "\u4e2d\u56fd\u4f9b\u5e94\u5546\u6c60",
    description: "\u4ee5 +86 \u4f9b\u5e94\u5546\u3001\u5de5\u5382\u3001\u51fa\u53e3\u5546\u4e3a\u4e3b"
  },
  {
    id: "chinese_merchant",
    label: "\u672c\u5730\u534e\u5546\u6c60",
    description: "\u672c\u5730\u53f7\u7801 + China / Chinese business signal"
  },
  {
    id: "importer",
    label: "\u8fdb\u53e3\u8d38\u6613\u6c60",
    description: "\u66f4\u504f import / wholesale / distribution / trade"
  }
];

export const INDUSTRY_PRESETS = [
  {
    id: "electronics_electrical",
    label: "\u7535\u5b50\u7535\u5668",
    englishLabel: "Electronics & Electrical",
    exportGroupLabel: "\u7535\u5b50\u7535\u5668",
    exportCategoryEnglish: "electronics-electrical",
    exportCategoryLocal: "\u7535\u5b50/\u7535\u6c14/\u534a\u5bfc\u4f53/PCB",
    keywords: [
      "electronics",
      "electrical",
      "semiconductor",
      "pcb",
      "pcba",
      "lcd",
      "oled",
      "charger",
      "adapter",
      "cctv",
      "led display"
    ]
  },
  {
    id: "automotive_machinery",
    label: "\u6c7d\u8f66\u6c7d\u914d",
    englishLabel: "Automotive & Machinery",
    exportGroupLabel: "\u6c7d\u8f66\u6c7d\u914d",
    exportCategoryEnglish: "automotive-auto-parts",
    exportCategoryLocal: "\u6c7d\u914d/\u6c7d\u8f66\u914d\u4ef6/\u5361\u8f66\u914d\u4ef6",
    keywords: [
      "autoparts",
      "auto parts",
      "car parts",
      "truck parts",
      "trailer parts",
      "brake",
      "suspension",
      "diagnostic tools",
      "garage equipment",
      "machine tool",
      "industrial equipment",
      "hydraulic breaker"
    ]
  },
  {
    id: "building_home",
    label: "\u5efa\u6750\u5bb6\u5c45",
    englishLabel: "Building & Home",
    exportGroupLabel: "\u5efa\u6750\u5bb6\u5c45",
    exportCategoryEnglish: "building-materials-home",
    exportCategoryLocal: "\u5efa\u6750/\u5bb6\u5c45/\u4e94\u91d1/\u536b\u6d74",
    keywords: [
      "building materials",
      "furniture",
      "hardware",
      "sanitary ware",
      "tiles",
      "home products"
    ]
  },
  {
    id: "trade_wholesale",
    label: "\u7efc\u5408\u8d38\u6613\u6279\u53d1",
    englishLabel: "Trade & Wholesale",
    exportGroupLabel: "\u7efc\u5408\u8d38\u6613\u6279\u53d1",
    exportCategoryEnglish: "trade-wholesale-import",
    exportCategoryLocal: "\u8d38\u6613/\u6279\u53d1/\u8fdb\u53e3/\u5206\u9500",
    keywords: [
      "wholesale",
      "importadora",
      "distribuidora",
      "comercio exterior",
      "proveedores chinos"
    ]
  }
];

export const COUNTRY_PRESETS = {
  Brazil: {
    country: "Brazil",
    braveCountry: "BR",
    countryTerms: ["Brazil", "Brasil"],
    defaultPhoneCode: "+55",
    defaultSearchLang: "pt-br",
    localRoles: [
      "importador",
      "distribuidor",
      "atacadista",
      "comercio exterior",
      "wholesale",
      "dealer"
    ],
    supplierRoles: ["supplier", "manufacturer", "factory", "exporter", "whatsapp"],
    chinaPhrases: [
      "importacao da China",
      "negocio da china",
      "fornecedor da china",
      "china",
      "importados da china"
    ],
    importerPhrases: [
      "comercio exterior",
      "importacao",
      "distribuicao",
      "atacado"
    ]
  },
  Mexico: {
    country: "Mexico",
    braveCountry: "MX",
    countryTerms: ["Mexico", "M\u00e9xico"],
    defaultPhoneCode: "+52",
    defaultSearchLang: "es",
    localRoles: [
      "importador",
      "distribuidor",
      "mayoreo",
      "comercio exterior",
      "wholesale",
      "dealer"
    ],
    supplierRoles: ["supplier", "manufacturer", "factory", "exporter", "whatsapp"],
    chinaPhrases: [
      "productos chinos",
      "proveedores chinos",
      "de China",
      "china",
      "importadora china"
    ],
    importerPhrases: [
      "importacion",
      "wholesale",
      "distribution",
      "trade",
      "comercio exterior"
    ]
  }
};

export function getCountryPreset(country) {
  if (!country) {
    return null;
  }

  const exact = COUNTRY_PRESETS[country];
  if (exact) {
    return exact;
  }

  const normalizedCountry = String(country).trim().toLowerCase();
  return Object.values(COUNTRY_PRESETS).find((preset) => {
    return preset.country.toLowerCase() === normalizedCountry;
  }) ?? null;
}

export function getIndustryPreset(industryGroup) {
  if (!industryGroup) {
    return null;
  }

  return INDUSTRY_PRESETS.find((preset) => preset.id === industryGroup) ?? null;
}

export function getPlatform(platformId) {
  return PLATFORM_OPTIONS.find((platform) => platform.id === platformId) ?? null;
}

export function normalizeBraveLanguage(language, fallback = "en") {
  const fallbackValue = normalizeBraveLanguageValue(fallback);
  const normalized = normalizeBraveLanguageValue(language);
  return normalized || fallbackValue || "en";
}

export function normalizeBraveCountry(country, fallback = "US") {
  const fallbackValue = normalizeBraveCountryValue(fallback);
  const normalized = normalizeBraveCountryValue(country);
  return normalized || fallbackValue || "US";
}

export function getAppConfig() {
  return {
    port: Number(process.env.PORT || 3000),
    baseUrl: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    braveApiKey: process.env.BRAVE_API_KEY || "",
    braveCountry: process.env.DEFAULT_BRAVE_COUNTRY || "US",
    defaultSearchLang: process.env.DEFAULT_SEARCH_LANG || "en",
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    requestDelayMs: 900,
    resultCount: 10
  };
}

function loadDotEnv() {
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key]) {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function normalizeBraveLanguageValue(language) {
  const value = String(language || "").trim().toLowerCase();
  if (!value) {
    return "";
  }

  const aliasValue = BRAVE_LANGUAGE_ALIASES[value] || value;
  return BRAVE_LANGUAGE_CODES.has(aliasValue) ? aliasValue : "";
}

function normalizeBraveCountryValue(country) {
  const value = String(country || "").trim();
  if (!value) {
    return "";
  }

  if (/^[A-Za-z]{2}$/.test(value)) {
    return value.toUpperCase();
  }

  return BRAVE_COUNTRY_ALIASES[value.toLowerCase()] || "";
}
