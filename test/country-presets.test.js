import test from "node:test";
import assert from "node:assert/strict";

import { COUNTRY_PRESETS, getCountryPreset } from "../src/config.js";
import { buildQueryPlan, normalizeSearchPayload } from "../src/query-builder.js";

test("country catalog contains only the ten supported markets", () => {
  assert.deepEqual(
    Object.values(COUNTRY_PRESETS).map((preset) => preset.chineseName),
    ["中国", "马来西亚", "印尼", "南非", "加纳", "肯尼亚", "墨西哥", "巴西", "尼日利亚", "越南"]
  );
});

test("country presets match Chinese name, country code, and phone code", () => {
  const byChineseName = getCountryPreset("巴西");
  const byCountryCode = getCountryPreset("BR");
  const byPhoneCode = getCountryPreset("+55");

  assert.equal(byChineseName?.country, "Brazil");
  assert.equal(byCountryCode?.country, "Brazil");
  assert.equal(byPhoneCode?.country, "Brazil");
  assert.equal(byChineseName?.defaultPhoneCode, "+55");
  assert.equal(byChineseName?.countryCode, "BR");
  assert.equal(byChineseName?.braveCountry, "BR");
});

test("search payload normalizes a country code, phone code, and selected cities", () => {
  const input = normalizeSearchPayload({
    searchTerm: "electronics distributor",
    country: "MY",
    cities: ["吉隆坡", "Penang"],
    platforms: ["instagram"],
    maxQueries: 4
  });

  assert.equal(input.country, "Malaysia");
  assert.equal(input.phoneCode, "+60");
  assert.equal(input.braveCountry, "MY");
  assert.equal(input.searchLanguage, "ms");
  assert.deepEqual(input.cities, ["Kuala Lumpur", "Penang"]);
  assert.equal(input.city, "Kuala Lumpur / Penang");
});

test("search payload accepts a Chinese country name and falls back when Brave does not support that market", () => {
  const input = normalizeSearchPayload({
    searchTerm: "building materials importer",
    country: "肯尼亚",
    platforms: ["facebook"],
    maxQueries: 2
  });

  assert.equal(input.country, "Kenya");
  assert.equal(input.phoneCode, "+254");
  assert.equal(input.braveCountry, "ALL");
});

test("unsupported Brave countries keep their ISO code in the preset but search through ALL", () => {
  const nigeria = getCountryPreset("NG");

  assert.equal(nigeria?.country, "Nigeria");
  assert.equal(nigeria?.countryCode, "NG");
  assert.equal(nigeria?.braveCountry, "ALL");
});

test("query plan distributes early queries across selected cities and platforms", () => {
  const input = normalizeSearchPayload({
    searchTerm: "wholesale electronics",
    country: "Nigeria",
    cities: ["Lagos", "Abuja"],
    platforms: ["facebook", "instagram"],
    maxQueries: 4
  });

  const plan = buildQueryPlan(input);

  assert.equal(plan.length, 4);
  assert.deepEqual(plan.map((query) => query.platformId), [
    "facebook",
    "instagram",
    "facebook",
    "instagram"
  ]);
  assert.ok(plan[0].text.includes("Lagos Nigeria"));
  assert.ok(plan[1].text.includes("Lagos Nigeria"));
  assert.ok(plan[2].text.includes("Abuja Nigeria"));
  assert.ok(plan[3].text.includes("Abuja Nigeria"));
});
