import { randomUUID } from "node:crypto";

export function createId() {
  return randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

export function uniqueStrings(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
}

export function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return [];
  }

  return [value];
}

export function mergeUnique(leftValues, rightValues) {
  return uniqueStrings([...toArray(leftValues), ...toArray(rightValues)]);
}

export function safeText(value) {
  return String(value ?? "").trim();
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function readJsonBody(request) {
  const chunks = [];
  let totalLength = 0;

  for await (const chunk of request) {
    totalLength += chunk.length;
    if (totalLength > 1_000_000) {
      throw new Error("Request body too large");
    }

    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

export function sendText(response, statusCode, text, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  response.end(text);
}

export function sendSseHeaders(response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });
  response.write("\n");
}

export function writeSseMessage(response, payload) {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function notFound(response) {
  sendJson(response, 404, {
    error: "not_found",
    message: "Resource not found"
  });
}

export function badRequest(response, message) {
  sendJson(response, 400, {
    error: "bad_request",
    message
  });
}

export function internalError(response, message) {
  sendJson(response, 500, {
    error: "internal_error",
    message
  });
}

export function canonicalizeUrl(input) {
  try {
    const parsed = new URL(input);
    parsed.hash = "";
    parsed.search = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.protocol = parsed.protocol.toLowerCase();
    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return safeText(input);
  }
}

export function detectPlatformFromUrl(input) {
  const lower = safeText(input).toLowerCase();
  if (lower.includes("instagram.com")) {
    return "instagram";
  }

  if (lower.includes("facebook.com")) {
    return "facebook";
  }

  return "unknown";
}

export function buildCsv(rows, headers) {
  const headerLine = headers.map((header) => escapeCsvValue(header.label)).join(",");
  const valueLines = rows.map((row) => {
    return headers.map((header) => escapeCsvValue(row[header.key])).join(",");
  });

  return [headerLine, ...valueLines].join("\n");
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }

  return stringValue;
}

export function pick(obj, keys) {
  return keys.reduce((result, key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
    return result;
  }, {});
}
