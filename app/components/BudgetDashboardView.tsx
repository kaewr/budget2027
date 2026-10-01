"use client";

import { ArrowDownToLine, Landmark, RefreshCw, Search } from "lucide-react";
import BudgetBand, { type BudgetBandItem } from "./BudgetBand";
import NodeHeader, { type Breadcrumb } from "./NodeHeader";
import RankedTable, { type RankedRow } from "./RankedTable";
import TreemapView from "./TreemapView";

export type BudgetCategoryView = BudgetBandItem & { count: number };
export type PlanTypeShare = { id: string; label: string; amount: number; color: string };
const planTypeLabels: Record<string, string> = { basic: "พื้นฐาน", strategic: "ยุทธศาสตร์", integrated: "บูรณาการ", other: "อื่น ๆ" };

type Props = {
  view: "overview" | "plans" | "units";
  onViewChange: (view: "overview" | "plans" | "units") => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onExport: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  fiscalYear: number;
  totalAmount: number;
  enactedAmount: number;
  categories: BudgetCategoryView[];
  activeCategoryId: string;
  onCategorySelect: (item: BudgetBandItem) => void;
  selectedCategory: BudgetCategoryView;
  categoryNodes: BudgetBandItem[];
  selectedNodeId?: string;
  onNodeSelect: (item: BudgetBandItem) => void;
  onRankedSelect: (id: string | number) => void;
  onSelectUnit: (id: string | number) => void;
  nodeTitle: string;
  nodeType: string;
  nodeAmount: number;
  nodeParentAmount: number;
  nodePage: number | null;
  nodeIsLeaf: boolean;
  breadcrumbs: Breadcrumb[];
  nodeColor: string;
  onBack: () => void;
  tableRows: RankedRow[];
  totalRows: number;
  tableAmount: number;
  hasMore: boolean;
  onShowMore: () => void;
  treemapMode: boolean;
  onTreemapModeChange: (value: boolean) => void;
  planRows: RankedRow[];
  visiblePlanCount: number;
  allPlansCount: number;
  onSelectPlan: (id: string | number) => void;
  planTypeOptions: string[];
  selectedPlanType: string;
  onPlanTypeChange: (value: string) => void;
  unitRows: RankedRow[];
  unitCount: number;
  selectedUnit: { id: number; name: string; amount: number } | null;
  receiverCount: number;
  localGovCount: number;
  planTypeShares: PlanTypeShare[];
  planCoverageAmount: number;
  selectedPlan: { id: string; name: string; amount: number; color: string } | null;
  planRecipients: RankedRow[];
  recipientCount: number;
  recipientQuery: string;
  onRecipientQueryChange: (value: string) => void;
  recipientHasMore: boolean;
  onRecipientShowMore: () => void;
};

function shortMoney(value: number) {
  if (value >= 1_000_000_000_000) return { value: (value / 1_000_000_000_000).toFixed(3), unit: "ล้านล้านบาท" };
  if (value >= 1_000_000_000) return { value: (value / 1_000_000_000).toFixed(2), unit: "พันล้านบาท" };
  if (value >= 1_000_000) return { value: (value / 1_000_000).toFixed(2), unit: "ล้านบาท" };
  return { value: new Intl.NumberFormat("th-TH").format(value), unit: "บาท" };
}

function thaiDigits(value: number) {
  return value.toLocaleString("th-TH", { useGrouping: false }).replace(/[0-9]/g, (digit) => "๐๑๒๓๔๕๖๗๘๙"[Number(digit)]);
}

function LoadingRows() {
  return <div className="loading-rows" aria-label="กำลังโหลดรายการ">{Array.from({ length: 5 }, (_, index) => <div className="loading-row" key={index} />)}</div>;
}

export default function BudgetDashboardView(props: Props) {
  const activeView: string = props.view;
  const hero = shortMoney(props.totalAmount);
  const heroFull = new Intl.NumberFormat("th-TH").format(props.totalAmount);
  const tableCount = props.totalRows;

  return (
    <main className="public-finance">
      <header className="site-header">
        <div className="site-header-inner">
          <a className="site-brand" href="#overview" aria-label="หน้าภาพรวม"><Landmark size={20} />งบประมาณไทย</a>
          <nav className="site-nav" aria-label="หน้ารายงาน">
            {([ ["overview", "ภาพรวม"], ["plans", "แผนงาน"], ["units", "หน่วยงาน"] ] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={props.view === id} onClick={() => props.onViewChange(id)}>{label}</button>)}
          </nav>
          <label className="site-search"><Search size={17} /><input value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder="ค้นหางบประมาณ" aria-label="ค้นหางบประมาณ" /></label>
        </div>
      </header>

      <div className="page-shell" id="overview">
        <section className="page-topline">
          <div>
            <h1 className="hero-title">งบประมาณรายจ่ายประจำปี พ.ศ. {thaiDigits(props.fiscalYear)}</h1>
            <p className="hero-total" title={`${heroFull} บาท`}>{hero.value}<small className="hero-total-unit">{hero.unit}</small></p>
            <p className="hero-note">{heroFull} บาท · {props.enactedAmount === props.totalAmount ? "ยอดตรงกับพระราชบัญญัติงบประมาณ" : "ยอดรวมจากรายการในฐานข้อมูล"}</p>
          </div>
          <div className="header-actions"><span className={`data-status ${props.error ? "is-error" : ""}`}><i />{props.loading ? "กำลังอ่านข้อมูล" : props.error ? "ตรวจสอบข้อมูล" : "ข้อมูลจาก Supabase"}</span><button className="quiet-button" type="button" onClick={props.onRetry} title="โหลดข้อมูลใหม่"><RefreshCw size={16} />ปรับปรุง</button>{props.view === "plans" && <button className="export-button" type="button" onClick={props.onExport} disabled={!props.planRecipients.length}><ArrowDownToLine size={16} />ส่งออก CSV</button>}</div>
        </section>

        {props.error && <div className="data-error">โหลดข้อมูลไม่สำเร็จ: {props.error}<button type="button" onClick={props.onRetry}>ลองอีกครั้ง</button></div>}

        {props.view === "overview" && <>
          <section className="section-block" aria-labelledby="category-band-heading">
            <div className="section-heading"><h2 id="category-band-heading">สัดส่วนงบประมาณตามหมวด</h2><p>เลือกหมวดเพื่อดูการจัดสรรด้านล่าง</p></div>
            {props.loading ? <div className="loading-bar" aria-label="กำลังโหลดแถบงบประมาณ" /> : <BudgetBand items={props.categories} total={props.totalAmount} selectedId={props.activeCategoryId} onSelect={props.onCategorySelect} label="หมวดงบประมาณ" />}
          </section>

          <section className="section-block">
            <NodeHeader title={props.nodeTitle} typeLabel={props.nodeType} amount={props.nodeAmount} parentAmount={props.nodeParentAmount} totalAmount={props.totalAmount} breadcrumbs={props.breadcrumbs} page={props.nodePage} siblingShare={props.nodeParentAmount ? props.nodeAmount / props.nodeParentAmount * 100 : 0} categoryColor={props.nodeColor} leaf={props.nodeIsLeaf} onBack={props.onBack} />
            <div className="section-heading"><h2>{props.nodeIsLeaf ? "รายการงบประมาณ" : "รายการภายใต้ระดับนี้"}</h2><p>สัดส่วนคำนวณจากยอดรวมของรายการระดับแม่</p></div>
            {props.loading ? <div className="loading-bar" aria-label="กำลังโหลดรายการ" /> : props.nodeIsLeaf ? <p className="empty-message">รายการนี้เป็นระดับล่างสุดที่ พ.ร.บ. ระบุ <button type="button" onClick={props.onBack}>กลับไปยังรายการแม่</button></p> : <>
              {props.categoryNodes.length > 0 && <BudgetBand items={props.categoryNodes} total={props.nodeAmount} selectedId={props.selectedNodeId} onSelect={props.onNodeSelect} label="สัดส่วนรายการย่อย" compact />}
              <div className="view-toggle" role="group" aria-label="มุมมองรายการ"><button type="button" aria-pressed={!props.treemapMode} onClick={() => props.onTreemapModeChange(false)}>ตาราง</button><button type="button" aria-pressed={props.treemapMode} onClick={() => props.onTreemapModeChange(true)}>แผนภาพ</button></div>
              {props.treemapMode ? <TreemapView items={props.categoryNodes} total={props.nodeAmount} onSelect={props.onNodeSelect} /> : props.loading ? <LoadingRows /> : <RankedTable rows={props.tableRows} totalCount={tableCount} totalAmount={props.nodeAmount} onSelect={(row) => props.onRankedSelect(row.id)} onShowMore={props.onShowMore} hasMore={props.hasMore} emptyText={props.query ? `ไม่พบรายการที่ตรงกับ “${props.query}”` : "ไม่มีรายการย่อย"} onClearSearch={props.query ? () => props.onQueryChange("") : undefined} highlightQuery={props.query} />}
            </>}
            <div className="cross-link">แสดงสัดส่วนจากรายการระดับรากและความสัมพันธ์ parent-child ในพระราชบัญญัติ</div>
          </section>
        </>}

        {props.view === "plans" && <>
          <div className="view-tabs"><button type="button" aria-pressed={activeView === "overview"} onClick={() => props.onViewChange("overview")}>ภาพรวม</button><button type="button" aria-pressed={activeView === "plans"} onClick={() => props.onViewChange("plans")}>แผนงาน</button><button type="button" aria-pressed={activeView === "units"} onClick={() => props.onViewChange("units")}>หน่วยงาน</button></div>
          <section className="section-block">
            <h2 className="definition-heading">ตัวเลขสำคัญ</h2>
            <dl className="definition-list">
              <div className="definition-row"><dt>หน่วยรับงบประมาณ</dt><dd>{props.receiverCount.toLocaleString("th-TH")}</dd></div>
              <div className="definition-row"><dt>แผนงาน</dt><dd>{props.allPlansCount.toLocaleString("th-TH")}</dd></div>
              <div className="definition-row"><dt>อปท. ในโครงสร้าง</dt><dd>{props.localGovCount.toLocaleString("th-TH")}</dd></div>
            </dl>
            <div className="stacked-plan-block">
              <p className="stacked-label">สัดส่วนงบตามประเภทแผนงาน <span>(ภายในยอดที่ผ่านแผนงาน)</span></p>
              <div className="stacked-plan-band" role="img" aria-label="สัดส่วนประเภทงบแผนงาน">{props.planTypeShares.map((item) => <i key={item.id} title={`${item.label} ${item.amount.toLocaleString("th-TH")} บาท`} style={{ width: `${props.planCoverageAmount ? item.amount / props.planCoverageAmount * 100 : 0}%`, background: item.color }} />)}</div>
              <div className="stacked-legend">{props.planTypeShares.map((item) => <span key={item.id}><i style={{ background: item.color }} />{item.label}<b>{props.planCoverageAmount ? (item.amount / props.planCoverageAmount * 100).toFixed(1) : "0.0"}%</b></span>)}</div>
              <p className="stacked-plan-note">นับเฉพาะวงเงินที่เชื่อมผ่านแผนงาน ({props.totalAmount ? (props.planCoverageAmount / props.totalAmount * 100).toFixed(1) : "0.0"}% ของงบรวมทั้งหมด)</p>
            </div>
          </section>
          <div className="filter-chips" role="group" aria-label="กรองตามประเภทแผน"><button type="button" aria-pressed={props.selectedPlanType === "ทั้งหมด"} onClick={() => props.onPlanTypeChange("ทั้งหมด")}>ทั้งหมด</button>{props.planTypeOptions.map((type) => <button type="button" key={type} aria-pressed={props.selectedPlanType === type} onClick={() => props.onPlanTypeChange(type)}>{planTypeLabels[type] ?? type}</button>)}</div>

          <section className="section-block ranked-section">
            <div className="section-heading"><h2>แผนงาน</h2><p>{props.visiblePlanCount.toLocaleString("th-TH")} จาก {props.allPlansCount.toLocaleString("th-TH")}</p></div>
            {props.loading ? <LoadingRows /> : <RankedTable rows={props.planRows} totalCount={props.visiblePlanCount} totalAmount={props.planCoverageAmount} onSelect={(row) => props.onSelectPlan(row.id)} emptyText="ไม่พบแผนงานที่ตรงกับตัวกรอง" onClearSearch={props.query ? () => props.onQueryChange("") : undefined} highlightQuery={props.query} />}
          </section>

          <section className="section-block zone-divider">
            {props.selectedPlan ? <NodeHeader title={props.selectedPlan.name} typeLabel="แผนงาน" amount={props.selectedPlan.amount} parentAmount={props.totalAmount} totalAmount={props.totalAmount} categoryColor={props.selectedPlan.color} /> : <div className="empty-message">เลือกแผนงานจากตารางด้านบนเพื่อดูผู้รับงบ</div>}
            <div className="section-heading"><h2>หน่วยรับภายใต้แผนงาน</h2><p>วงเงินรวม {props.selectedPlan ? shortMoney(props.selectedPlan.amount).value : "0"} {props.selectedPlan ? shortMoney(props.selectedPlan.amount).unit : "บาท"}</p></div>
            <div className="report-filter"><label className="report-search"><Search size={16} /><input value={props.recipientQuery} onChange={(event) => props.onRecipientQueryChange(event.target.value)} placeholder="ค้นหาหน่วยรับงบประมาณ" /></label><span className="data-status"><i />{props.recipientCount.toLocaleString("th-TH")} หน่วยรับ</span></div>
            {props.loading ? <LoadingRows /> : <RankedTable rows={props.planRecipients} totalCount={props.recipientCount} totalAmount={props.selectedPlan?.amount ?? 0} onSelect={(row) => props.onSelectUnit(row.id)} onShowMore={props.onRecipientShowMore} hasMore={props.recipientHasMore} emptyText={props.recipientQuery ? `ไม่พบรายการที่ตรงกับ “${props.recipientQuery}”` : "ไม่พบหน่วยรับในแผนนี้"} onClearSearch={props.recipientQuery ? () => props.onRecipientQueryChange("") : undefined} />}
          </section>

          <p className="cross-link">วงเงินในแผน {shortMoney(props.planCoverageAmount).value} {shortMoney(props.planCoverageAmount).unit} จากยอดรวม {shortMoney(props.totalAmount).value} {shortMoney(props.totalAmount).unit}</p>
        </>}

        {props.view === "units" && <>
          <div className="view-tabs"><button type="button" aria-pressed={activeView === "overview"} onClick={() => props.onViewChange("overview")}>ภาพรวม</button><button type="button" aria-pressed={activeView === "plans"} onClick={() => props.onViewChange("plans")}>แผนงาน</button><button type="button" aria-pressed={activeView === "units"} onClick={() => props.onViewChange("units")}>หน่วยงาน</button></div>
          {props.selectedUnit && <NodeHeader title={props.selectedUnit.name} typeLabel="หน่วยรับงบประมาณ" amount={props.selectedUnit.amount} parentAmount={props.totalAmount} totalAmount={props.totalAmount} categoryColor="var(--category-3)" />}
          <section className="ranked-section"><h2>หน่วยงานยอดสูงสุด</h2>{props.loading ? <LoadingRows /> : <RankedTable rows={props.unitRows} totalCount={props.unitCount} totalAmount={props.totalAmount} onSelect={(row) => props.onSelectUnit(row.id)} highlightQuery={props.query} onClearSearch={props.query ? () => props.onQueryChange("") : undefined} />}</section>
        </>}

        <footer className="report-footer"><span>ข้อมูลจาก Supabase · ปีงบประมาณ พ.ศ. {props.fiscalYear.toLocaleString("th-TH")}</span><span>{props.error ? "สถานะ: ตรวจสอบข้อมูล" : props.loading ? "กำลังโหลดข้อมูล" : "ยอดรวมตรงกับพระราชบัญญัติ"}</span></footer>
      </div>
    </main>
  );
}