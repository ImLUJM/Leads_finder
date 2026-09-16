import categoryRows from "./alibaba-category-taxonomy.json" with { type: "json" };

import { safeText, uniqueStrings } from "./utils.js";

const ROOT_TO_INDUSTRY_GROUP_RULES = [
  {
    industryGroup: "electronics_electrical",
    pattern: /(electronic|electrical|light|appliance|security|telecommunication)/i
  },
  {
    industryGroup: "automotive_machinery",
    pattern: /(automotive|vehicle|machinery|equipment|tool|hardware|material handling|fabrication)/i
  },
  {
    industryGroup: "building_home",
    pattern: /(construction|home|garden|furniture|real estate)/i
  }
];

const CATEGORY_LOOKUP = new Map();
const ROOT_NODES = [];

hydrateCategoryIndex(categoryRows);

export function getCategoryTree() {
  return ROOT_NODES.map(serializeNodeForClient);
}

export function getCategoryNode(categoryId) {
  return CATEGORY_LOOKUP.get(safeText(categoryId)) ?? null;
}

export function resolveCategorySelection(payload = {}) {
  const requestedLeaf = getCategoryNode(payload.categoryLevel3);
  const requestedLevel2 = getCategoryNode(payload.categoryLevel2);
  const requestedLevel1 = getCategoryNode(payload.categoryLevel1);
  const selectedNode = requestedLeaf || requestedLevel2 || requestedLevel1;

  if (!selectedNode) {
    return null;
  }

  const lineage = getLineage(selectedNode);
  const level1 = lineage.find((node) => node.depth === 1) ?? null;
  const level2 = lineage.find((node) => node.depth === 2) ?? null;
  const level3 = lineage.find((node) => node.depth === 3) ?? null;
  const descendantLeafIds = selectedNode.depth === 3
    ? [selectedNode.id]
    : [...selectedNode.descendantLeafIds];

  return {
    id: selectedNode.id,
    depth: selectedNode.depth,
    label: selectedNode.label,
    localLabel: selectedNode.localLabel || "",
    displayLabel: buildDisplayLabel(selectedNode),
    level1Id: level1?.id || "",
    level1Label: level1?.label || "",
    level2Id: level2?.id || "",
    level2Label: level2?.label || "",
    level3Id: level3?.id || "",
    level3Label: level3?.label || "",
    level3LocalLabel: level3?.localLabel || "",
    pathEnglish: lineage.map((node) => node.label),
    queryTerms: buildQueryTerms(selectedNode),
    matchingTerms: buildMatchingTerms(selectedNode),
    descendantLeafIds,
    suggestedIndustryGroup: inferIndustryGroupFromCategory(selectedNode)
  };
}

export function inferIndustryGroupFromCategory(selectionOrNode) {
  const rootLabel = safeText(
    selectionOrNode?.level1Label
    || selectionOrNode?.pathEnglish?.[0]
    || selectionOrNode?.label
  );

  if (!rootLabel) {
    return "";
  }

  return ROOT_TO_INDUSTRY_GROUP_RULES.find((rule) => rule.pattern.test(rootLabel))?.industryGroup || "trade_wholesale";
}

export function findBestCategoryMatch(text, selection) {
  const haystack = safeText(text).toLowerCase();
  if (!haystack || !selection?.descendantLeafIds?.length) {
    return null;
  }

  let bestMatch = null;

  selection.descendantLeafIds.forEach((leafId) => {
    const node = getCategoryNode(leafId);
    if (!node) {
      return;
    }

    const leafTerms = uniqueStrings([
      node.label,
      node.localLabel,
      ...splitLocalTerms(node.localLabel)
    ]);
    const parentTerms = uniqueStrings([
      node.pathEnglish[1],
      node.pathEnglish[0]
    ]);
    const matchedLeafTerms = leafTerms.filter((term) => haystack.includes(term.toLowerCase()));
    if (!matchedLeafTerms.length) {
      return;
    }

    const matchedParentTerms = parentTerms.filter((term) => haystack.includes(safeText(term).toLowerCase()));
    const score = matchedLeafTerms.length * 4 + matchedParentTerms.length;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        id: node.id,
        label: node.label,
        localLabel: node.localLabel,
        pathEnglish: [...node.pathEnglish],
        displayLabel: buildDisplayLabel(node),
        matchedTerms: uniqueStrings([...matchedLeafTerms, ...matchedParentTerms]),
        score
      };
    }
  });

  return bestMatch?.score >= 4 ? bestMatch : null;
}

function hydrateCategoryIndex(rows) {
  rows.forEach((row) => {
    const level1Label = safeText(row.level1);
    const level2Label = safeText(row.level2);
    const level3Label = safeText(row.level3);
    const localLabel = safeText(row.localLabel);

    if (!level1Label || !level2Label || !level3Label || isHeaderLikeRow({
      level1Label,
      level2Label,
      level3Label,
      localLabel
    })) {
      return;
    }

    const level1Id = buildNodeId("l1", [level1Label]);
    const level2Id = buildNodeId("l2", [level1Label, level2Label]);
    const level3Id = buildNodeId("l3", [level1Label, level2Label, level3Label]);

    const level1Node = ensureNode({
      id: level1Id,
      parentId: "",
      depth: 1,
      label: level1Label,
      localLabel: "",
      pathEnglish: [level1Label]
    });

    const level2Node = ensureNode({
      id: level2Id,
      parentId: level1Id,
      depth: 2,
      label: level2Label,
      localLabel: "",
      pathEnglish: [level1Label, level2Label]
    });

    const level3Node = ensureNode({
      id: level3Id,
      parentId: level2Id,
      depth: 3,
      label: level3Label,
      localLabel,
      pathEnglish: [level1Label, level2Label, level3Label]
    });

    appendChild(level1Node, level2Node.id);
    appendChild(level2Node, level3Node.id);
  });

  ROOT_NODES.length = 0;
  CATEGORY_LOOKUP.forEach((node) => {
    if (!node.parentId) {
      ROOT_NODES.push(node);
    }
  });

  ROOT_NODES.sort((left, right) => compareLabel(left.label, right.label));
  ROOT_NODES.forEach((node) => hydrateDescendantLeafIds(node));
}

function ensureNode(node) {
  const existingNode = CATEGORY_LOOKUP.get(node.id);
  if (existingNode) {
    return existingNode;
  }

  const nextNode = {
    ...node,
    children: [],
    descendantLeafIds: []
  };
  CATEGORY_LOOKUP.set(node.id, nextNode);
  return nextNode;
}

function appendChild(parentNode, childId) {
  if (!parentNode.children.includes(childId)) {
    parentNode.children.push(childId);
    parentNode.children.sort((leftId, rightId) => {
      const leftNode = getCategoryNode(leftId);
      const rightNode = getCategoryNode(rightId);
      return compareLabel(leftNode?.label, rightNode?.label);
    });
  }
}

function hydrateDescendantLeafIds(node) {
  if (node.depth === 3) {
    node.descendantLeafIds = [node.id];
    return node.descendantLeafIds;
  }

  node.descendantLeafIds = uniqueStrings(
    node.children.flatMap((childId) => {
      const childNode = getCategoryNode(childId);
      return childNode ? hydrateDescendantLeafIds(childNode) : [];
    })
  );
  return node.descendantLeafIds;
}

function serializeNodeForClient(node) {
  return {
    id: node.id,
    label: node.label,
    localLabel: node.localLabel,
    depth: node.depth,
    suggestedIndustryGroup: inferIndustryGroupFromCategory(node),
    children: node.children
      .map((childId) => getCategoryNode(childId))
      .filter(Boolean)
      .map(serializeNodeForClient)
  };
}

function buildNodeId(prefix, parts) {
  return `${prefix}:${parts.map((part) => slugify(part)).join(":")}`;
}

function slugify(value) {
  const normalized = safeText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "item";
}

function getLineage(node) {
  const lineage = [];
  let currentNode = node;

  while (currentNode) {
    lineage.unshift(currentNode);
    currentNode = currentNode.parentId ? getCategoryNode(currentNode.parentId) : null;
  }

  return lineage;
}

function buildQueryTerms(node) {
  const lineage = getLineage(node);
  const englishTerms = [
    node.label,
    lineage.at(-2)?.label,
    lineage[0]?.label
  ].filter(Boolean);

  return uniqueStrings(englishTerms);
}

function buildMatchingTerms(node) {
  return uniqueStrings([
    ...buildQueryTerms(node),
    node.localLabel,
    ...splitLocalTerms(node.localLabel)
  ]);
}

function splitLocalTerms(value) {
  return uniqueStrings(
    safeText(value)
      .split(/[\/／、,，]/)
      .map((part) => safeText(part))
      .filter((part) => part.length >= 2)
  );
}

function buildDisplayLabel(node) {
  const localLabel = safeText(node.localLabel);
  if (!localLabel) {
    return node.label;
  }

  return `${localLabel} / ${node.label}`;
}

function compareLabel(left, right) {
  return safeText(left).localeCompare(safeText(right), "en");
}

function isHeaderLikeRow({ level1Label, level2Label, level3Label, localLabel }) {
  return level1Label.includes("Level 1")
    && level2Label.includes("Level 2")
    && level3Label.includes("Level 3")
    && localLabel.toLowerCase().includes("translation");
}
