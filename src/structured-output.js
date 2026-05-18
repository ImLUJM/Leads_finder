import { getIndustryPreset } from "./config.js";
import { safeText } from "./utils.js";

export const STRUCTURED_EXPORT_HEADERS = [
  { key: "country", label: "\u56fd\u5bb6" },
  { key: "city", label: "\u57ce\u5e02" },
  { key: "industryGroup", label: "\u884c\u4e1a\u7ec4" },
  { key: "companyPage", label: "\u516c\u53f8/\u9875\u9762" },
  { key: "phone", label: "\u624b\u673a" },
  { key: "facebookLink", label: "Facebook\u94fe\u63a5" },
  { key: "categoryEnglish", label: "\u7c7b\u76ee\u82f1\u6587" },
  { key: "categoryLocal", label: "\u7c7b\u76ee\u672c\u5730\u8bed\u8a00" },
  { key: "matchedKeywords", label: "\u547d\u4e2d\u5173\u952e\u8bcd" },
  { key: "summary", label: "\u6458\u8981" }
];

export function buildStructuredLeadRow(lead) {
  const industryPreset = getIndustryPreset(lead.industryGroup);
  const location = inferDisplayLocation(lead) || safeText(lead.city);
  const companyPage = [safeText(lead.title), location].filter(Boolean).join(" | ");

  return {
    country: safeText(lead.country),
    city: location || "\u6682\u65e0",
    industryGroup: industryPreset?.exportGroupLabel || industryPreset?.label || safeText(lead.industryGroup),
    companyPage: companyPage || safeText(lead.sourceUrl || lead.canonicalUrl),
    phone: formatSpreadsheetPhone(lead.phone),
    facebookLink: safeText(lead.sourceUrl || lead.canonicalUrl),
    categoryEnglish: industryPreset?.exportCategoryEnglish || industryPreset?.englishLabel || safeText(lead.industryGroup),
    categoryLocal: industryPreset?.exportCategoryLocal || industryPreset?.label || "",
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
