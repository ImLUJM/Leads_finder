import test from "node:test";
import assert from "node:assert/strict";

import { extractLeadCandidates } from "../src/lead-extractor.js";
import { normalizeSearchPayload } from "../src/query-builder.js";

const baseJob = {
  id: "job-1",
  phoneCode: "+55",
  country: "Brazil",
  city: "Sao Paulo",
  industryGroup: "automotive_machinery",
  poolType: "local_customer",
  platforms: ["facebook"]
};

test("lead extraction stores an explainable high confidence score", () => {
  const [lead] = extractLeadCandidates({
    rank: 1,
    title: "Auto Parts Distribuidora",
    description: "Auto parts distributor and wholesale supplier. WhatsApp +55 11 99999-8888",
    extraSnippets: [],
    url: "https://facebook.com/example-auto-parts",
    queryText: "site:facebook.com Brazil auto parts +55",
    platform: "facebook"
  }, baseJob);

  assert.ok(lead);
  assert.equal(lead.qualityTier, "refined");
  assert.equal(lead.confidence, "high");
  assert.ok(lead.rawResult.qualityScore >= 75);
  assert.ok(lead.rawResult.qualityFactors.some((factor) => factor.code === "phone_code"));
  assert.ok(lead.rawResult.qualityFactors.some((factor) => factor.code === "industry_signal"));
});

test("noise signals prevent a result from being refined and reduce its score", () => {
  const [lead] = extractLeadCandidates({
    rank: 2,
    title: "Auto Parts Restaurant",
    description: "Restaurant and food delivery. Call +55 11 3333-4444",
    extraSnippets: [],
    url: "https://facebook.com/example-restaurant",
    queryText: "site:facebook.com Brazil auto parts +55",
    platform: "facebook"
  }, baseJob);

  assert.ok(lead);
  assert.equal(lead.qualityTier, "broad");
  assert.ok(lead.rawResult.qualityFactors.some((factor) => factor.code === "noise_signal" && factor.points < 0));
  assert.ok(lead.rawResult.qualityScore < 75);
});

test("selected category contributes matched category metadata and scoring", () => {
  const categoryJob = {
    id: "job-2",
    poolType: "local_customer",
    platforms: ["facebook"],
    ...normalizeSearchPayload({
      searchTerm: "headsets importer",
      phoneCode: "+55",
      country: "Brazil",
      categoryLevel1: "l1:consumer-electronics",
      categoryLevel2: "l2:consumer-electronics:earphone-and-headphone-and-accessories",
      categoryLevel3: "l3:consumer-electronics:earphone-and-headphone-and-accessories:telephone-headsets",
      platforms: ["facebook"]
    })
  };

  const [lead] = extractLeadCandidates({
    rank: 1,
    title: "Telephone Headsets Distribuidora",
    description: "Wholesale telephone headsets with WhatsApp +55 11 99999-8888",
    extraSnippets: [],
    url: "https://facebook.com/example-headsets",
    queryText: "site:facebook.com Brazil headsets importer",
    platform: "facebook"
  }, categoryJob);

  assert.ok(lead);
  assert.equal(lead.rawResult.matchedCategory?.label, "Telephone Headsets");
  assert.ok(lead.rawResult.qualityFactors.some((factor) => factor.code === "category_signal"));
  assert.ok(lead.matchedKeywords.includes("Telephone Headsets"));
});
