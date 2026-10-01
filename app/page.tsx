"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import BudgetDashboardView, { type BudgetCategoryView, type PlanTypeShare } from "./components/BudgetDashboardView";
import type { BudgetBandItem } from "./components/BudgetBand";
import type { RankedRow } from "./components/RankedTable";
import type { Breadcrumb } from "./components/NodeHeader";
import { categoryColor, planColor } from "./theme/colors";

type Relation<T> = T | T[] | null;
type BudgetRow = {
  id: number; parent_id: number | null; act_id: number; section_id: number; entity_id: number;
  code: string; level: number; label: string; name: string; type: string; plan_type: string | null;
  amount: number; is_leaf: boolean; path_names: string[]; page: number | null;
  entity: Relation<{ name: string; type: string; plan_type: string | null }>;
  act: Relation<{ fiscal_year_be: number; total_amount: number; title: string }>;
  section: Relation<{ section_no: number; title: string | null }>;
};
type Category = { id: string; label: string; types: string[]; amount: number; count: number };
type Recipient = { id: number; name: string; amount: number; rows: number };
type PlanSummary = { id: string; name: string; planType: string; path: string; amount: number; rows: number; recipients: Map<number, Recipient> };

const PAGE_SIZE = 1000;
const typeLabels: Record<string, string> = {
  agency: "หน่วยงาน", ministry: "กระทรวงและหน่วยงานในกำกับ", plan: "แผนงาน", central_item: "รายการงบกลาง",
  fund: "กองทุน", fund_group: "กลุ่มกองทุน", local_gov: "องค์กรปกครองส่วนท้องถิ่น",
  local_gov_group: "กลุ่มองค์กรปกครองส่วนท้องถิ่น", region: "ภาคและพื้นที่", province: "จังหวัด", province_group: "กลุ่มจังหวัด",
};
const categories: Array<Omit<Category, "amount" | "count">> = [
  { id: "central", label: "งบประมาณรายจ่ายงบกลาง", types: ["central_item"] },
  { id: "receiving", label: "งบประมาณรายจ่ายหน่วยรับ", types: ["ministry", "agency"] },
  { id: "local", label: "องค์กรปกครองส่วนท้องถิ่นและพื้นที่", types: ["local_gov_group", "local_gov", "region"] },
  { id: "fund", label: "กองทุนและทุนหมุนเวียน", types: ["fund_group"] },
  { id: "plan", label: "แผนงานตั้งต้น", types: ["plan"] },
];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseClient = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function one<T>(value: Relation<T>): T | null { return Array.isArray(value) ? value[0] ?? null : value; }
export default function Dashboard() {
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"overview" | "plans" | "units">("overview");
  const [activeCategory, setActiveCategory] = useState("");
  const [drillPath, setDrillPath] = useState<BudgetRow[]>([]);
  const [query, setQuery] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [drillLimit, setDrillLimit] = useState(100);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientLimit, setRecipientLimit] = useState(100);
  const [treemapMode, setTreemapMode] = useState(false);
  const [showOtherRows, setShowOtherRows] = useState(false);
  const [planTypeFilter, setPlanTypeFilter] = useState("ทั้งหมด");
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  async function loadData() {
    setLoading(true); setError("");
    if (!supabaseClient) { setRows([]); setError("ยังไม่ได้กำหนด URL หรือ publishable key ของ Supabase"); setLoading(false); return; }
    try {
      const columns = "id,parent_id,act_id,section_id,entity_id,code,level,label,name,type,plan_type,amount,is_leaf,path_names,page,entity:entities(name,type,plan_type),act:budget_acts(fiscal_year_be,total_amount,title),section:sections(section_no,title)";
      const readPage = (from: number, withCount = false) => supabaseClient.from("budget_items").select(columns, { count: withCount ? "exact" : undefined }).order("id").range(from, from + PAGE_SIZE - 1).abortSignal(AbortSignal.timeout(30000));
      const { data: firstPage, error: firstError, count } = await readPage(0, true);
      if (firstError) throw firstError;
      if (!count) { setRows([]); setError("ไม่พบรายการใน budget_items ที่เปิดให้อ่าน"); return; }
      const offsets = Array.from({ length: Math.ceil(count / PAGE_SIZE) - 1 }, (_, index) => (index + 1) * PAGE_SIZE);
      const remaining = await Promise.all(offsets.map(async (from) => {
        const { data, error: pageError } = await readPage(from);
        if (pageError) throw pageError;
        return (data ?? []) as unknown as BudgetRow[];
      }));
      setRows([...((firstPage ?? []) as unknown as BudgetRow[]), ...remaining.flat()]);
    } catch (cause) { setRows([]); setError(cause instanceof Error ? cause.message : "ไม่สามารถอ่านข้อมูลจาก Supabase ได้"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadData(); }, []);

  const rowsById = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  const childrenByParent = useMemo(() => {
    const children = new Map<number, BudgetRow[]>();
    for (const row of rows) { if (row.parent_id === null) continue; const siblings = children.get(row.parent_id) ?? []; siblings.push(row); children.set(row.parent_id, siblings); }
    return children;
  }, [rows]);
  const roots = useMemo(() => rows.filter((row) => row.parent_id === null), [rows]);
  const rootTotal = roots.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const actAmounts = new Map(roots.map((row) => [row.act_id, Number(one(row.act)?.total_amount ?? 0)]));
  const actTotal = [...actAmounts.values()].reduce((sum, value) => sum + value, 0);
  const fiscalYear = one(roots[0]?.act ?? null)?.fiscal_year_be ?? 2570;
  const categoryData: Category[] = categories.map((entry) => {
    const members = roots.filter((row) => entry.types.includes(row.type));
    return { ...entry, amount: members.reduce((sum, row) => sum + Number(row.amount || 0), 0), count: members.length };
  });
  const category = categoryData.find((item) => item.id === activeCategory) ?? [...categoryData].sort((a, b) => b.amount - a.amount)[0];
  const categoryRoots = roots.filter((row) => category?.types.includes(row.type));
  const drillParent = drillPath.at(-1) ?? null;
  const drillRows = (drillParent ? childrenByParent.get(drillParent.id) ?? [] : categoryRoots)
    .filter((row) => `${row.name} ${row.code} ${row.path_names.join(" ")}`.toLocaleLowerCase("th").includes(query.toLocaleLowerCase("th")))
    .sort((a, b) => Number(b.amount) - Number(a.amount));
  const drillTotal = drillParent ? Number(drillParent.amount) : Number(category?.amount ?? 0);
  const rankedDrillRows = showOtherRows ? drillRows.slice(11) : drillRows;
  const visibleDrillRows = rankedDrillRows.slice(0, drillLimit);

  const plans = useMemo(() => {
    const summaries = new Map<string, PlanSummary>();
    const receiverTypes = new Set(["agency", "ministry", "local_gov", "local_gov_group", "fund", "central_item"]);
    for (const leaf of rows.filter((row) => row.is_leaf)) {
      let cursor: BudgetRow | undefined = leaf; let plan: BudgetRow | undefined; let receiver: BudgetRow | undefined;
      while (cursor) {
        if (!plan && cursor.type === "plan") plan = cursor;
        if (!receiver && receiverTypes.has(cursor.type) && cursor.type !== "plan") receiver = cursor;
        cursor = cursor.parent_id === null ? undefined : rowsById.get(cursor.parent_id);
      }
      if (!plan) continue;
      const summary = summaries.get(plan.name) ?? { id: plan.name, name: plan.name, planType: plan.plan_type ?? one(plan.entity)?.plan_type ?? "other", path: plan.path_names.slice(-2).join(" › "), amount: 0, rows: 0, recipients: new Map<number, Recipient>() };
      const amount = Number(leaf.amount || 0); summary.amount += amount; summary.rows += 1;
      if (receiver) { const unit = summary.recipients.get(receiver.id) ?? { id: receiver.id, name: receiver.name, amount: 0, rows: 0 }; unit.amount += amount; unit.rows += 1; summary.recipients.set(receiver.id, unit); }
      summaries.set(plan.name, summary);
    }
    return [...summaries.values()].sort((a, b) => b.amount - a.amount);
  }, [rows, rowsById]);
  const matchingPlans = plans.filter((plan) => (planTypeFilter === "ทั้งหมด" || plan.planType === planTypeFilter) && plan.name.toLocaleLowerCase("th").includes(query.toLocaleLowerCase("th")));
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? matchingPlans[0] ?? plans[0] ?? null;
  const planRecipients = selectedPlan ? [...selectedPlan.recipients.values()].sort((a, b) => b.amount - a.amount) : [];
  const matchingRecipients = planRecipients.filter((recipient) => recipient.name.toLocaleLowerCase("th").includes(recipientQuery.toLocaleLowerCase("th")));
  const visibleRecipients = matchingRecipients.slice(0, recipientLimit);
  const planCoveredAmount = plans.reduce((sum, plan) => sum + plan.amount, 0);

  function exportPlanCsv() {
    if (!selectedPlan || !planRecipients.length) return;
    const headings = ["ปีงบประมาณ พ.ศ.", "แผนงาน", "หน่วยรับงบประมาณ", "วงเงินตามแผน (บาท)", "สัดส่วนในแผน", "จำนวนรายการ"];
    const records = planRecipients.map((unit) => [fiscalYear, selectedPlan.name, unit.name, unit.amount, `${(unit.amount / selectedPlan.amount * 100).toFixed(2)}%`, unit.rows]);
    const csv = [headings, ...records].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `รายงานแผนงาน-${fiscalYear}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  const categoryViews: BudgetCategoryView[] = categoryData.map((item) => ({ ...item, shortLabel: item.label.replace("งบประมาณรายจ่าย", "งบฯ").replace("องค์กรปกครองส่วนท้องถิ่นและพื้นที่", "ท้องถิ่น/พื้นที่"), color: categoryColor(item.id) }));
  const selectedCategory = categoryViews.find((item) => item.id === category?.id) ?? categoryViews[0];
  const drillBandItems: BudgetBandItem[] = drillRows.map((row) => ({ id: String(row.id), label: row.name, shortLabel: row.name, amount: Number(row.amount || 0), color: categoryColor(category?.id ?? "other") }));
  const rankedDrillViewRows: RankedRow[] = visibleDrillRows.map((row, index) => ({
    id: row.id,
    label: row.label || String(index + 1),
    name: row.name,
    typeLabel: typeLabels[row.type] ?? row.type,
    amount: Number(row.amount || 0),
    share: drillTotal ? Number(row.amount || 0) / drillTotal * 100 : 0,
    childCount: childrenByParent.get(row.id)?.length ?? 0,
    computed: !row.is_leaf,
    color: categoryColor(category?.id ?? "other"),
    path: row.path_names.slice(-2).join(" › "),
  }));
  const agencyGroups = new Map<number, { id: number; name: string; amount: number; rows: number; path: string }>();
  for (const leaf of rows.filter((row) => row.is_leaf && row.type === "agency")) {
    const unit = one(leaf.entity);
    const entry = agencyGroups.get(leaf.entity_id) ?? { id: leaf.entity_id, name: unit?.name ?? leaf.name, amount: 0, rows: 0, path: leaf.path_names.slice(-2).join(" › ") };
    entry.amount += Number(leaf.amount || 0);
    entry.rows += 1;
    agencyGroups.set(leaf.entity_id, entry);
  }
  const unitBaseRows: RankedRow[] = [...agencyGroups.values()].sort((a, b) => b.amount - a.amount).map((unit, index) => ({ id: unit.id, label: String(index + 1), name: unit.name, typeLabel: "หน่วยงาน", amount: unit.amount, share: rootTotal ? unit.amount / rootTotal * 100 : 0, childCount: unit.rows, computed: false, color: categoryColor("receiving"), path: unit.path }));
  const unitRows = unitBaseRows.filter((unit) => unit.name.toLocaleLowerCase("th").includes(query.toLocaleLowerCase("th"))).slice(0, drillLimit);
  const planToRankedRow = (plan: PlanSummary, index: number): RankedRow => ({ id: plan.id, label: String(index + 1), name: plan.name, typeLabel: typeLabels[plan.planType] ?? "แผนงาน", amount: plan.amount, share: rootTotal ? plan.amount / rootTotal * 100 : 0, childCount: plan.recipients.size, computed: true, color: planColor(plan.planType), path: plan.path });
  const matchingPlanRows: RankedRow[] = matchingPlans.map(planToRankedRow);
  const recipientRankRows: RankedRow[] = visibleRecipients.map((unit, index) => ({ id: unit.id, label: String(index + 1), name: unit.name, typeLabel: "หน่วยรับงบประมาณ", amount: unit.amount, share: selectedPlan?.amount ? unit.amount / selectedPlan.amount * 100 : 0, childCount: unit.rows, computed: false, color: planColor("strategic") }));
  const selectedPlanView = selectedPlan ? { id: selectedPlan.id, name: selectedPlan.name, amount: selectedPlan.amount, color: planColor(selectedPlan.planType) } : null;
  const planFilterOptions = [...new Set(plans.map((plan) => plan.planType))];
  const planTypeTotals = new Map<string, number>();
  for (const plan of plans) planTypeTotals.set(plan.planType, (planTypeTotals.get(plan.planType) ?? 0) + plan.amount);
  const planTypeLabels: Record<string, string> = { basic: "พื้นฐาน", strategic: "ยุทธศาสตร์", integrated: "บูรณาการ", other: "อื่น ๆ" };
  const planTypeShares: PlanTypeShare[] = [...planTypeTotals].map(([id, amount]) => ({ id, label: planTypeLabels[id] ?? id, amount, color: planColor(id) }));
  const receiverCount = new Set(roots.filter((row) => ["agency", "ministry", "local_gov", "local_gov_group", "fund_group"].includes(row.type)).map((row) => row.entity_id)).size;
  const localGovCount = new Set(rows.filter((row) => row.type === "local_gov").map((row) => row.id)).size;
  const breadcrumbItems: Breadcrumb[] = [
    { label: category?.label ?? "หมวดงบประมาณ", onClick: () => { setDrillPath([]); setShowOtherRows(false); } },
    ...drillPath.map((node, index) => ({ label: node.name, onClick: () => { setDrillPath(drillPath.slice(0, index + 1)); setShowOtherRows(false); } })),
  ];
  const currentNode = drillPath.at(-1) ?? null;
  const currentParent = currentNode?.parent_id === null || currentNode?.parent_id === undefined ? null : rowsById.get(currentNode.parent_id) ?? null;
  const currentNodeAmount = currentNode ? Number(currentNode.amount || 0) : Number(category?.amount || 0);
  const currentParentAmount = currentParent ? Number(currentParent.amount || 0) : currentNode ? Number(category?.amount || 0) : rootTotal;
  const selectedUnit = selectedUnitId === null ? null : (() => { const unit = unitBaseRows.find((item) => item.id === selectedUnitId); return unit ? { id: Number(unit.id), name: unit.name, amount: unit.amount } : null; })();
  return (
    <BudgetDashboardView
      view={view}
      onViewChange={(nextView) => { setView(nextView); setQuery(""); }}
      loading={loading}
      error={error}
      onRetry={() => void loadData()}
      onExport={exportPlanCsv}
      query={query}
      onQueryChange={(value) => { setQuery(value); setDrillLimit(100); }}
      fiscalYear={fiscalYear}
      totalAmount={rootTotal}
      enactedAmount={actTotal}
      categories={categoryViews}
      activeCategoryId={category?.id ?? ""}
      onCategorySelect={(item) => {
        setView("overview");
        if (item.id === "__other__") setShowOtherRows(true);
        else { setActiveCategory(item.id); setShowOtherRows(false); }
        setDrillPath([]);
        setQuery("");
        setDrillLimit(100);
      }}
      selectedCategory={selectedCategory}
      categoryNodes={drillBandItems}
      selectedNodeId={drillParent ? String(drillParent.id) : undefined}
      onNodeSelect={(item) => {
        if (item.id === "__other__") { setShowOtherRows(true); return; }
        const row = drillRows.find((node) => String(node.id) === item.id);
        if (row) { setDrillPath([...drillPath, row]); setShowOtherRows(false); setDrillLimit(100); }
      }}
      onRankedSelect={(id) => {
        const row = drillRows.find((node) => String(node.id) === String(id));
        if (row) { setDrillPath([...drillPath, row]); setShowOtherRows(false); setDrillLimit(100); }
      }}
      nodeTitle={currentNode?.name ?? category?.label ?? "งบประมาณ"}
      nodeType={currentNode ? typeLabels[currentNode.type] ?? currentNode.type : "หมวดงบประมาณ"}
      nodeAmount={currentNodeAmount}
      nodeParentAmount={currentParentAmount}
      nodePage={currentNode?.page ?? null}
      nodeIsLeaf={Boolean(currentNode?.is_leaf)}
      breadcrumbs={breadcrumbItems}
      nodeColor={categoryColor(category?.id ?? "other")}
      onBack={() => { setDrillPath(drillPath.slice(0, -1)); setShowOtherRows(false); setDrillLimit(100); }}
      tableRows={rankedDrillViewRows}
      totalRows={rankedDrillRows.length}
      tableAmount={rankedDrillRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)}
      hasMore={visibleDrillRows.length < rankedDrillRows.length}
      onShowMore={() => setDrillLimit(drillLimit + 100)}
      treemapMode={treemapMode}
      onTreemapModeChange={setTreemapMode}
      planRows={matchingPlanRows}
      visiblePlanCount={matchingPlanRows.length}
      allPlansCount={plans.length}
      onSelectPlan={(id) => { setSelectedPlanId(String(id)); setView("plans"); setQuery(""); }}
      planTypeOptions={planFilterOptions}
      selectedPlanType={planTypeFilter}
      onPlanTypeChange={(value) => { setPlanTypeFilter(value); setSelectedPlanId(null); }}
      unitRows={unitRows}
      unitCount={agencyGroups.size}
      selectedUnit={selectedUnit}
      onSelectUnit={(id) => {
        setSelectedUnitId(Number(id));
        const root = roots.find((row) => row.entity_id === Number(id) && ["agency", "ministry", "local_gov", "local_gov_group", "fund_group"].includes(row.type));
        if (root) {
          const target = categoryData.find((item) => item.types.includes(root.type));
          setActiveCategory(target?.id ?? "receiving");
          setDrillPath([root]);
          setView("overview");
          setQuery("");
          setDrillLimit(100);
        } else setView("units");
      }}
      receiverCount={receiverCount}
      localGovCount={localGovCount}
      planTypeShares={planTypeShares}
      planCoverageAmount={planCoveredAmount}
      selectedPlan={selectedPlanView}
      planRecipients={recipientRankRows}
      recipientCount={matchingRecipients.length}
      recipientQuery={recipientQuery}
      onRecipientQueryChange={(value) => { setRecipientQuery(value); setRecipientLimit(100); }}
      recipientHasMore={visibleRecipients.length < matchingRecipients.length}
      onRecipientShowMore={() => setRecipientLimit(recipientLimit + 100)}
    />
  );
}