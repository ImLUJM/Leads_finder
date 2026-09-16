import test from "node:test";
import assert from "node:assert/strict";

import { BraveClient } from "../src/brave-client.js";

function createClient(overrides = {}) {
  return new BraveClient({
    braveApiKey: "test-key",
    braveCountry: "US",
    defaultSearchLang: "en",
    resultCount: 10,
    requestTimeoutMs: 1_000,
    proxyConfigured: false,
    proxyEnabled: false,
    ...overrides
  });
}

test("Brave transport reports direct, inactive proxy, and active proxy modes", () => {
  assert.equal(createClient().transport, "direct");
  assert.equal(createClient({ proxyConfigured: true }).transport, "proxy-not-enabled");
  assert.equal(createClient({ proxyConfigured: true, proxyEnabled: true }).transport, "proxy");
});
