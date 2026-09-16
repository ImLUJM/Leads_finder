import test from "node:test";
import assert from "node:assert/strict";

import { buildQueryPlan, normalizeSearchPayload } from "../src/query-builder.js";

test("query plan alternates across selected platforms", () => {
  const input = normalizeSearchPayload({
    searchTerm: "autoparts importer",
    phoneCode: "+55",
    country: "Brazil",
    industryGroup: "automotive_machinery",
    poolType: "local_customer",
    platforms: ["facebook", "instagram"],
    maxQueries: 8
  });

  const plan = buildQueryPlan(input);
  const platformIds = plan.map((query) => query.platformId);

  assert.equal(plan.length, 8);
  assert.deepEqual(platformIds, [
    "facebook",
    "instagram",
    "facebook",
    "instagram",
    "facebook",
    "instagram",
    "facebook",
    "instagram"
  ]);
  assert.equal(plan.filter((query) => query.platformId === "facebook").length, 4);
  assert.equal(plan.filter((query) => query.platformId === "instagram").length, 4);
});

test("query plan respects the max query count for a single platform", () => {
  const input = normalizeSearchPayload({
    searchTerm: "electronics wholesale",
    phoneCode: "+52",
    country: "Mexico",
    platforms: ["instagram"],
    maxQueries: 3
  });

  const plan = buildQueryPlan(input);

  assert.equal(plan.length, 3);
  assert.ok(plan.every((query) => query.platformId === "instagram"));
  assert.deepEqual(plan.map((query) => query.index), [0, 1, 2]);
});

test("category selection is normalized and enriches query topics", () => {
  const input = normalizeSearchPayload({
    searchTerm: "headsets importer",
    phoneCode: "+52",
    country: "Mexico",
    categoryLevel1: "l1:consumer-electronics",
    categoryLevel2: "l2:consumer-electronics:earphone-and-headphone-and-accessories",
    categoryLevel3: "l3:consumer-electronics:earphone-and-headphone-and-accessories:telephone-headsets",
    platforms: ["facebook"],
    maxQueries: 4
  });

  const plan = buildQueryPlan(input);

  assert.equal(input.categorySelection?.level3Label, "Telephone Headsets");
  assert.equal(input.industryGroup, "electronics_electrical");
  assert.ok(plan.some((query) => query.text.includes("Telephone Headsets")));
});
