import { getIndustryPreset } from "./config.js";
import { safeText } from "./utils.js";

export const STRUCTURED_EXPORT_HEADERS = [
  { key: "country", label: "\u56fd\u5bb6" },
  { key: "city", label: "\u57ce\u5e02" },
  { key: "industryGroup", label: "\u884c\u4e1a\u7ec4" },
  { key: "companyPage", label: "\u516c\u53f8/\u9875\u9762" },
  { key: "phone", label: "\u624b\u673a" },
  { key: "facebookLink", label: "Facebook\u94fe\u63a5" },
  { key: "categoryLevel1", label: "\u4e00\u7ea7\u7c7b\u76ee" },
  { key: "categoryLevel2", label: "\u4e8c\u7ea7\u7c7b\u76ee" },
  { key: "categoryLevel3", label: "\u4e09\u7ea7\u7c7b\u76ee" },
  { key: "categoryEnglish", label: "\u7c7b\u76ee\u82f1\u6587" },
  { key: "categoryLocal", label: "\u7c7b\u76ee\u672c\u5730\u8bed\u8a00" },
  { key: "matchedKeywords", label: "\u547d\u4e2d\u5173\u952e\u8bcd" },
  { key: "summary", label: "\u6458\u8981" }
];

export function buildStructuredLeadRow(lead) {
  const industryPreset = getIndustryPreset(lead.industryGroup);
  const category = extractLeadCategory(lead, industryPreset);
  const location = inferDisplayLocation(lead) || safeText(lead.city);
  const companyPage = [safeText(lead.title), location].filter(Boolean).join(" | ");

  return {
    country: safeText(lead.country),
    city: location || "\u6682\u65e0",
    industryGroup: category.industryGroup,
    companyPage: companyPage || safeText(lead.sourceUrl || lead.canonicalUrl),
    phone: formatSpreadsheetPhone(lead.phone),
    facebookLink: safeText(lead.sourceUrl || lead.canonicalUrl),
    categoryLevel1: category.categoryLevel1,
    categoryLevel2: category.categoryLevel2,
    categoryLevel3: category.categoryLevel3,
    categoryEnglish: category.categoryEnglish,
    categoryLocal: category.categoryLocal,
    matchedKeywords: formatMatchedKeywordText(lead),
    summary: normalizeSummaryText(lead.summary)
  };
}

export function sortStructuredLeadRows(rows) {
  return [...rows].sort((left, right) => {
    return compareText(left.city, right.city)
      || compareText(left.industryGroup, right.industryGroup)
      || compareText(left.companyPage, right.companyPage)
      || compareText(left.phone, right.phone);
  });
}

export function inferDisplayLocation(lead) {
  const title = safeText(lead.title);
  const summary = safeText(lead.summary);
  const alphaRange = "A-Za-z\\u00C0-\\u017F\\u4e00-\\u9fff' .-";

  const titleCityMatch = title.match(new RegExp(`,\\s*([${alphaRange}]{2,40})$`));
  if (titleCityMatch?.[1]) {
    return cleanupLocation(titleCityMatch[1]);
  }

  const summaryPipeMatch = summary.match(/\u00B7\s*([^\u00B7<>]{2,50})\s*\u00B7\s*(?:<strong>\+?\d|\+?\d|[A-Z0-9._%+-]+@)/i);
  if (summaryPipeMatch?.[1]) {
    return cleanupLocation(summaryPipeMatch[1]);
  }

  const likesCityMatch = summary.match(new RegExp(`,\\s*([${alphaRange}]{2,40})\\.\\s*\\d[\\d,.]*\\s+likes`, "i"));
  if (likesCityMatch?.[1]) {
    return cleanupLocation(likesCityMatch[1]);
  }

  return safeText(lead.city);
}

function cleanupLocation(value) {
  return safeText(value)
    .replace(/Page$/i, "")
    .replace(/Automotive.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

function formatSpreadsheetPhone(phone) {
  const value = safeText(phone);
  if (!value) {
    return "";
  }

  return `="${value.replace(/"/g, "\"\"")}"`;
}

function formatMatchedKeywordText(lead) {
  const matchedKeywords = Array.isArray(lead.matchedKeywords) ? lead.matchedKeywords : [];
  if (matchedKeywords.length) {
    return matchedKeywords.map((keyword) => safeText(keyword)).filter(Boolean).join(", ");
  }

  const matchedQueries = Array.isArray(lead.matchedQueries) ? lead.matchedQueries : [];
  if (matchedQueries.length) {
    return matchedQueries.map((query) => safeText(query)).filter(Boolean).join(" || ");
  }

  return "";
}

function normalizeSummaryText(summary) {
  return safeText(summary).replace(/\s*\r?\n+\s*/g, " ");
}

function compareText(left, right) {
  return safeText(left).localeCompare(safeText(right), "zh-Hans-CN");
}

function extractLeadCategory(lead, industryPreset) {
  const matchedCategory = lead.rawResult?.matchedCategory || lead.rawResult?.selectedCategory || null;
  const pathEnglish = Array.isArray(matchedCategory?.pathEnglish) ? matchedCategory.pathEnglish : [];

  return {
    industryGroup: industryPreset?.exportGroupLabel || industryPreset?.label || matchedCategory?.level1Label || safeText(lead.industryGroup),
    categoryLevel1: pathEnglish[0] || "",
    categoryLevel2: pathEnglish[1] || "",
    categoryLevel3: pathEnglish[2] || matchedCategory?.label || "",
    categoryEnglish: pathEnglish.length
      ? pathEnglish.join(" / ")
      : matchedCategory?.label || industryPreset?.exportCategoryEnglish || industryPreset?.englishLabel || safeText(lead.industryGroup),
    categoryLocal: matchedCategory?.localLabel
      || matchedCategory?.level3LocalLabel
      || matchedCategory?.displayLabel
      || industryPreset?.exportCategoryLocal
      || industryPreset?.label
      || ""
  };
}
