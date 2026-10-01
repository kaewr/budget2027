import { readFile } from "node:fs/promises";

const environment = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
    }),
);
const url = environment.NEXT_PUBLIC_SUPABASE_URL;
const key = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) throw new Error("กรุณากำหนด Supabase URL และ publishable key ใน .env.local");

const headers = { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" };

async function readAll(table, columns) {
  const records = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(`${url}/rest/v1/${table}?select=${columns}&limit=1000&offset=${offset}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`${table}: HTTP ${response.status} ${await response.text()}`);
    const page = await response.json();
    records.push(...page);
    if (page.length < 1000) return records;
  }
}

const [items, entities, acts, chapters, sections, nodeTypes, planTypes] = await Promise.all([
  readAll("budget_items", "id,parent_id,amount,is_leaf,type,plan_type,entity_id,act_id,section_id,level,name,path_names"),
  readAll("entities", "id,name,type,plan_type"),
  readAll("budget_acts", "id,fiscal_year_be,total_amount,title"),
  readAll("chapters", "id,title,chapter_no"),
  readAll("sections", "id,chapter_id,section_no"),
  readAll("node_types", "code,label_th"),
  readAll("plan_types", "code,label_th"),
]);

const leaves = items.filter((item) => item.is_leaf);
const entitiesById = new Map(entities.map((entity) => [entity.id, entity]));
const amountTotal = (records) => records.reduce((total, record) => total + Number(record.amount ?? 0), 0);
const grouped = (records, keyFor) => {
  const groups = new Map();
  for (const record of records) {
    const key = keyFor(record);
    const group = groups.get(key) ?? { amount: 0, count: 0 };
    group.amount += Number(record.amount ?? 0);
    group.count += 1;
    groups.set(key, group);
  }
  return groups;
};

const topEntities = [...grouped(leaves, (item) => item.entity_id)]
  .map(([id, totals]) => ({ name: entitiesById.get(id)?.name ?? `entity:${id}`, ...totals }))
  .sort((a, b) => b.amount - a.amount)
  .slice(0, 10);

const entityTypeById = new Map(entities.map((entity) => [entity.id, entity.type]));
const ministryEntities = [...grouped(leaves.filter((item) => entityTypeById.get(item.entity_id) === "ministry"), (item) => item.entity_id)]
  .map(([id, totals]) => ({ name: entitiesById.get(id)?.name ?? `entity:${id}`, ...totals }))
  .sort((a, b) => b.amount - a.amount)
  .slice(0, 10);
const agencyEntities = [...grouped(leaves.filter((item) => entityTypeById.get(item.entity_id) === "agency"), (item) => item.entity_id)]
  .map(([id, totals]) => ({ name: entitiesById.get(id)?.name ?? `entity:${id}`, ...totals }))
  .sort((a, b) => b.amount - a.amount)
  .slice(0, 10);

const itemsById = new Map(items.map((item) => [item.id, item]));
const planReports = new Map();
for (const leaf of leaves) {
  let current = leaf;
  let plan;
  let receiver;
  while (current) {
    if (!plan && current.type === "plan") plan = current;
    if (!receiver && ["agency", "ministry", "local_gov", "local_gov_group", "fund", "central_item"].includes(current.type) && current.type !== "plan") receiver = current;
    current = current.parent_id === null ? undefined : itemsById.get(current.parent_id);
  }
  if (!plan) continue;
  const report = planReports.get(plan.name) ?? { amount: 0, rows: 0, receivers: new Set() };
  report.amount += Number(leaf.amount ?? 0);
  report.rows += 1;
  if (receiver) report.receivers.add(receiver.id);
  planReports.set(plan.name, report);
}

const rootItems = items.filter((item) => item.parent_id === null);
const transitions = new Map();
for (const item of items) {
  const parent = itemsById.get(item.parent_id);
  if (!parent) continue;
  const key = `${parent.type} -> ${item.type}`;
  const current = transitions.get(key) ?? { count: 0, parentExample: parent.name, childExample: item.name };
  current.count += 1;
  transitions.set(key, current);
}
const childrenByRoot = new Map();
for (const item of items) {
  let ancestor = item;
  while (ancestor.parent_id !== null && itemsById.has(ancestor.parent_id)) ancestor = itemsById.get(ancestor.parent_id);
  if (ancestor.id !== item.id) continue;
  const key = `${ancestor.type}:${ancestor.name}`;
  const current = childrenByRoot.get(key) ?? { id: ancestor.id, name: ancestor.name, type: ancestor.type, amount: 0, rows: 0, childTypes: new Map() };
  current.amount += Number(item.amount ?? 0);
  current.rows += 1;
  current.childTypes.set(item.type, (current.childTypes.get(item.type) ?? 0) + 1);
  childrenByRoot.set(key, current);
}

const report = {
  counts: {
    budget_items: items.length,
    leaf_items: leaves.length,
    parent_items: items.length - leaves.length,
    entities: entities.length,
    budget_acts: acts.length,
    chapters: chapters.length,
    sections: sections.length,
    node_types: nodeTypes.length,
    plan_types: planTypes.length,
    orphan_entity_references: items.filter((item) => !entitiesById.has(item.entity_id)).length,
  },
  amounts: {
    leaf_items_sum: amountTotal(leaves),
    all_hierarchy_levels_sum: amountTotal(items),
    enacted_act_total: acts.reduce((sum, act) => sum + Number(act.total_amount ?? 0), 0),
  },
  fiscalYearsBE: [...new Set(acts.map((act) => act.fiscal_year_be))],
  itemTypes: Object.fromEntries([...grouped(items, (item) => item.type)].map(([key, value]) => [key, value.count])),
  leafItemTypes: Object.fromEntries([...grouped(leaves, (item) => item.type)].map(([key, value]) => [key, value.count])),
  entityTypes: Object.fromEntries([...grouped(entities, (entity) => entity.type)].map(([key, value]) => [key, value.count])),
  leafAmountByItemType: Object.fromEntries([...grouped(leaves, (item) => item.type)].map(([key, value]) => [key, value.amount])),
  entityPlanTypes: Object.fromEntries([...grouped(entities, (entity) => entity.plan_type ?? "ไม่ระบุ")].map(([key, value]) => [key, value.count])),
  hierarchyLevels: Object.fromEntries([...grouped(items, (item) => String(item.level))].map(([key, value]) => [key, value.count])),
  rootCount: rootItems.length,
  rootTypes: Object.fromEntries([...grouped(rootItems, (item) => item.type)].map(([key, value]) => [key, value.count])),
  rootAmountsByType: Object.fromEntries([...grouped(rootItems, (item) => item.type)].map(([key, value]) => [key, value.amount])),
  rootTotalAmount: amountTotal(rootItems),
  parentChildTransitions: Object.fromEntries([...transitions].sort((a, b) => b[1].count - a[1].count).map(([key, value]) => [key, value])),
  rootCategories: [...childrenByRoot.values()].sort((a, b) => b.amount - a.amount).slice(0, 30).map((item) => ({ ...item, childTypes: Object.fromEntries(item.childTypes) })),
  leafPlanTypes: Object.fromEntries([...grouped(leaves, (item) => item.plan_type ?? "ไม่ระบุ")].map(([key, value]) => [key, value.count])),
  topEntities,
  topMinistries: ministryEntities,
  topAgencies: agencyEntities,
  planReport: {
    unique_plan_names: planReports.size,
    assigned_leaf_amount: [...planReports.values()].reduce((sum, report) => sum + report.amount, 0),
    assigned_leaf_rows: [...planReports.values()].reduce((sum, report) => sum + report.rows, 0),
    distinct_receivers: new Set([...planReports.values()].flatMap((report) => [...report.receivers])).size,
  },
};

console.log(JSON.stringify(report, null, 2));