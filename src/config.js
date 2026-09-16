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

const BRAVE_COUNTRY_CODES = new Set([
  "ALL",
  "AR",
  "AU",
  "AT",
  "BE",
  "BR",
  "CA",
  "CL",
  "CN",
  "DK",
  "FI",
  "FR",
  "DE",
  "GR",
  "HK",
  "IN",
  "ID",
  "IT",
  "JP",
  "KR",
  "MY",
  "MX",
  "NL",
  "NZ",
  "NO",
  "PH",
  "PL",
  "PT",
  "RU",
  "SA",
  "ZA",
  "ES",
  "SE",
  "CH",
  "TW",
  "TR",
  "GB",
  "US"
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
  China: createCountryPreset("China", "中国", "CN", "+86", "zh-hans", ["China", "中国"], [
    city("北京", "Beijing"),
    city("上海", "Shanghai"),
    city("广州", "Guangzhou"),
    city("深圳", "Shenzhen"),
    city("杭州", "Hangzhou"),
    city("宁波", "Ningbo"),
    city("东莞", "Dongguan"),
    city("佛山", "Foshan"),
    city("义乌", "Yiwu"),
    city("青岛", "Qingdao")
  ]),
  Malaysia: createCountryPreset("Malaysia", "马来西亚", "MY", "+60", "ms", ["Malaysia"], [
    city("吉隆坡", "Kuala Lumpur"),
    city("新山", "Johor Bahru"),
    city("槟城", "Penang"),
    city("巴生", "Klang"),
    city("莎阿南", "Shah Alam"),
    city("马六甲", "Malacca"),
    city("怡保", "Ipoh"),
    city("亚庇", "Kota Kinabalu"),
    city("古晋", "Kuching")
  ]),
  Indonesia: createCountryPreset("Indonesia", "印尼", "ID", "+62", "en", ["Indonesia"], [
    city("雅加达", "Jakarta"),
    city("泗水", "Surabaya"),
    city("万隆", "Bandung"),
    city("棉兰", "Medan"),
    city("三宝垄", "Semarang"),
    city("丹格朗", "Tangerang"),
    city("勿加泗", "Bekasi"),
    city("望加锡", "Makassar"),
    city("巴淡", "Batam")
  ]),
  SouthAfrica: createCountryPreset("South Africa", "南非", "ZA", "+27", "en", ["South Africa"], [
    city("约翰内斯堡", "Johannesburg"),
    city("开普敦", "Cape Town"),
    city("德班", "Durban"),
    city("比勒陀利亚", "Pretoria"),
    city("伊丽莎白港", "Port Elizabeth"),
    city("布隆方丹", "Bloemfontein")
  ]),
  Ghana: createCountryPreset("Ghana", "加纳", "GH", "+233", "en", ["Ghana"], [
    city("阿克拉", "Accra"),
    city("库马西", "Kumasi"),
    city("特马", "Tema"),
    city("塔科拉迪", "Takoradi"),
    city("塔马利", "Tamale")
  ], {
    braveCountry: "ALL"
  }),
  Kenya: createCountryPreset("Kenya", "肯尼亚", "KE", "+254", "en", ["Kenya"], [
    city("内罗毕", "Nairobi"),
    city("蒙巴萨", "Mombasa"),
    city("基苏木", "Kisumu"),
    city("纳库鲁", "Nakuru"),
    city("埃尔多雷特", "Eldoret")
  ], {
    braveCountry: "ALL"
  }),
  Mexico: createCountryPreset(
    "Mexico",
    "墨西哥",
    "MX",
    "+52",
    "es",
    ["Mexico", "M\u00e9xico"],
    [
      city("墨西哥城", "Mexico City"),
      city("瓜达拉哈拉", "Guadalajara"),
      city("蒙特雷", "Monterrey"),
      city("普埃布拉", "Puebla"),
      city("蒂华纳", "Tijuana"),
      city("莱昂", "Leon"),
      city("克雷塔罗", "Queretaro"),
      city("梅里达", "Merida"),
      city("华雷斯城", "Ciudad Juarez")
    ],
    {
      localRoles: ["importador", "distribuidor", "mayoreo", "comercio exterior", "wholesale", "dealer"],
      supplierRoles: ["supplier", "manufacturer", "factory", "exporter", "whatsapp"],
      chinaPhrases: ["productos chinos", "proveedores chinos", "de China", "china", "importadora china"],
      importerPhrases: ["importacion", "wholesale", "distribution", "trade", "comercio exterior"]
    }
  ),
  Brazil: createCountryPreset(
    "Brazil",
    "巴西",
    "BR",
    "+55",
    "pt-br",
    ["Brazil", "Brasil"],
    [
      city("圣保罗", "Sao Paulo"),
      city("里约热内卢", "Rio de Janeiro"),
      city("贝洛奥里藏特", "Belo Horizonte"),
      city("库里蒂巴", "Curitiba"),
      city("阿雷格里港", "Porto Alegre"),
      city("巴西利亚", "Brasilia"),
      city("坎皮纳斯", "Campinas"),
      city("萨尔瓦多", "Salvador"),
      city("累西腓", "Recife"),
      city("马瑙斯", "Manaus")
    ],
    {
      localRoles: ["importador", "distribuidor", "atacadista", "comercio exterior", "wholesale", "dealer"],
      supplierRoles: ["supplier", "manufacturer", "factory", "exporter", "whatsapp"],
      chinaPhrases: [
        "importacao da China",
        "negocio da china",
        "fornecedor da china",
        "china",
        "importados da china"
      ],
      importerPhrases: ["comercio exterior", "importacao", "distribuicao", "atacado"]
    }
  ),
  Nigeria: createCountryPreset("Nigeria", "尼日利亚", "NG", "+234", "en", ["Nigeria"], [
    city("拉各斯", "Lagos"),
    city("阿布贾", "Abuja"),
    city("卡诺", "Kano"),
    city("哈科特港", "Port Harcourt"),
    city("伊巴丹", "Ibadan"),
    city("贝宁城", "Benin City"),
    city("卡杜纳", "Kaduna"),
    city("阿巴", "Aba")
  ], {
    braveCountry: "ALL"
  }),
  Vietnam: createCountryPreset("Vietnam", "越南", "VN", "+84", "vi", ["Vietnam"], [
    city("胡志明市", "Ho Chi Minh City"),
    city("河内", "Hanoi"),
    city("岘港", "Da Nang"),
    city("海防", "Hai Phong"),
    city("芹苴", "Can Tho"),
    city("边和", "Bien Hoa"),
    city("北宁", "Bac Ninh")
  ], {
    braveCountry: "ALL"
  })
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
    return [
      preset.country,
      preset.chineseName,
      preset.countryCode,
      preset.braveCountry,
      preset.defaultPhoneCode,
      ...(preset.countryTerms || [])
    ].some((value) => String(value || "").trim().toLowerCase() === normalizedCountry);
  }) ?? null;
}

function createCountryPreset(
  country,
  chineseName,
  countryCode,
  defaultPhoneCode,
  defaultSearchLang,
  countryTerms = [country],
  cities = [],
  overrides = {}
) {
  return {
    country,
    chineseName,
    countryCode,
    braveCountry: overrides.braveCountry || countryCode,
    countryTerms,
    defaultPhoneCode,
    defaultSearchLang,
    cities,
    ...overrides
  };
}

function city(label, value) {
  return {
    label,
    value
  };
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
  const proxyUrl = process.env.HTTPS_PROXY
    || process.env.https_proxy
    || process.env.HTTP_PROXY
    || process.env.http_proxy
    || "";
  const envProxyEnabled = process.execArgv.includes("--use-env-proxy")
    || process.env.NODE_USE_ENV_PROXY === "1";

  return {
    port: Number(process.env.PORT || 3000),
    baseUrl: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    braveApiKey: process.env.BRAVE_API_KEY || "",
    proxyConfigured: Boolean(proxyUrl),
    proxyEnabled: Boolean(proxyUrl) && envProxyEnabled,
    braveCountry: process.env.DEFAULT_BRAVE_COUNTRY || "US",
    defaultSearchLang: process.env.DEFAULT_SEARCH_LANG || "en",
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    requestDelayMs: Number(process.env.REQUEST_DELAY_MS || 900),
    requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 12_000),
    resultCount: Number(process.env.BRAVE_RESULT_COUNT || 10),
    maxConcurrentJobs: Number(process.env.MAX_CONCURRENT_JOBS || 2),
    jobRateLimit: Number(process.env.JOB_RATE_LIMIT || 5),
    jobRateWindowMs: Number(process.env.JOB_RATE_WINDOW_MS || 60_000)
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

  const upperValue = value.toUpperCase();
  if (BRAVE_COUNTRY_CODES.has(upperValue)) {
    return upperValue;
  }

  const aliasedValue = BRAVE_COUNTRY_ALIASES[value.toLowerCase()] || "";
  return BRAVE_COUNTRY_CODES.has(aliasedValue) ? aliasedValue : "";
}
