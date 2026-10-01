"use client";

import { useState } from "react";

export type Breadcrumb = { label: string; onClick?: () => void };
type Props = {
  title: string;
  typeLabel: string;
  amount: number;
  parentAmount: number;
  totalAmount: number;
  breadcrumbs?: Breadcrumb[];
  page?: number | null;
  siblingShare?: number;
  categoryColor: string;
  leaf?: boolean;
  onBack?: () => void;
};

const number = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

function amountUnit(value: number) {
  if (value >= 1_000_000_000_000) return { value: (value / 1_000_000_000_000).toFixed(2), unit: "ล้านล้านบาท" };
  if (value >= 1_000_000_000) return { value: (value / 1_000_000_000).toFixed(2), unit: "พันล้านบาท" };
  if (value >= 1_000_000) return { value: (value / 1_000_000).toFixed(2), unit: "ล้านบาท" };
  return { value: number.format(value), unit: "บาท" };
}

export default function NodeHeader({ title, typeLabel, amount, parentAmount, totalAmount, breadcrumbs = [], page, siblingShare, categoryColor, leaf = false, onBack }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, breadcrumbs.length - 4);
  const shown = !expanded && hiddenCount > 0 ? [...breadcrumbs.slice(0, 1), { label: "…", onClick: () => setExpanded(true) }, ...breadcrumbs.slice(-2)] : breadcrumbs;
  const value = amountUnit(amount);
  return (
    <header className="node-header">
      {!!breadcrumbs.length && <nav className="node-breadcrumb" aria-label="เส้นทาง"><button type="button" onClick={onBack}>ภาพรวม</button>{shown.map((crumb, index) => <span key={`${crumb.label}-${index}`}><i>›</i><button type="button" onClick={crumb.onClick}>{crumb.label}</button></span>)}</nav>}
      <h1>{title}</h1>
      <div className="node-meta"><i style={{ background: categoryColor }} /><span>{typeLabel}</span>{page !== null && page !== undefined && <span>อ้างอิงหน้า {page} ใน พ.ร.บ.</span>}{leaf && <span>รายการระดับล่างสุด</span>}</div>
      <div className="node-stat-row"><div className="node-primary-value" title={`${number.format(amount)} บาท`}><strong>{value.value}</strong><small>{value.unit}</small><span>({number.format(amount)} บาท)</span></div><div className="node-ratios"><span><b>{parentAmount ? (amount / parentAmount * 100).toFixed(2) : "0.00"}%</b> ของรายการแม่</span><span><b>{totalAmount ? (amount / totalAmount * 100).toFixed(2) : "0.00"}%</b> ของงบรวม</span></div></div>
      {siblingShare !== undefined && <div className="node-sibling-band" aria-label={`สัดส่วนในกลุ่ม ${siblingShare.toFixed(2)} เปอร์เซ็นต์`}><i style={{ width: `${Math.min(siblingShare, 100)}%`, background: categoryColor }} /></div>}
      {leaf && onBack && <p className="node-leaf-note">รายการนี้เป็นระดับล่างสุดที่ พ.ร.บ. ระบุ <button type="button" onClick={onBack}>กลับไปยังรายการแม่</button></p>}
    </header>
  );
}