"use client";

import { useMemo } from "react";
import { contrastTextColor } from "../theme/colors";

export type BudgetBandItem = {
  id: string;
  label: string;
  shortLabel?: string;
  amount: number;
  color: string;
};

type Props = {
  items: BudgetBandItem[];
  total: number;
  selectedId?: string;
  onSelect?: (item: BudgetBandItem) => void;
  label?: string;
  compact?: boolean;
};

const formatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

function abbreviated(value: number) {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)} ล้านล้าน`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} พันล้าน`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} ล้านบาท`;
  return `${formatter.format(value)} บาท`;
}

export default function BudgetBand({ items, total, selectedId, onSelect, label = "สัดส่วนงบประมาณ", compact = false }: Props) {
  const segments = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.amount - a.amount);
    if (sorted.length <= 12) return sorted;
    const remainder = sorted.slice(11);
    return [
      ...sorted.slice(0, 11),
      { id: "__other__", label: "อื่น ๆ", shortLabel: "อื่น ๆ", amount: remainder.reduce((sum, item) => sum + item.amount, 0), color: "var(--ink-muted)" },
    ];
  }, [items]);
  const visibleLegend = segments;

  return (
    <div className={`budget-band-block ${compact ? "budget-band-compact" : ""}`}>
      <div className="budget-band" role="group" aria-label={label}>
        {segments.map((item) => {
          const share = total > 0 ? item.amount / total * 100 : 0;
          const fullAmount = `${formatter.format(item.amount)} บาท`;
          const accessibleName = `${item.label}, ${fullAmount}, ${share.toFixed(2)}%`;
          return (
            <button
              className={`budget-band-segment ${selectedId === item.id ? "is-selected" : ""}`}
              key={item.id}
              type="button"
              style={{ backgroundColor: item.color, color: contrastTextColor(item.color), flexGrow: Math.max(item.amount, 0), flexBasis: 0 }}
              aria-label={accessibleName}
              aria-pressed={selectedId === item.id}
              title={`${item.label}\n${fullAmount}\n${share.toFixed(2)}%`}
              onClick={() => onSelect?.(item)}
            >
              <span className="budget-band-segment-copy"><b>{item.shortLabel ?? item.label}</b><small>{share.toFixed(1)}%</small></span>
              <span className="budget-band-tooltip" role="tooltip"><b>{item.label}</b><span>{fullAmount}</span><small>{share.toFixed(2)}%</small></span>
            </button>
          );
        })}
      </div>
      <div className="budget-band-legend" aria-label="คำอธิบายสัดส่วน">
        {visibleLegend.map((item) => <div className="budget-band-legend-item" key={item.id} title={`${item.label} · ${formatter.format(item.amount)} บาท · ${total ? (item.amount / total * 100).toFixed(2) : "0.00"}%`}><i style={{ backgroundColor: item.color }} /><span>{item.label}</span><strong>{abbreviated(item.amount)}</strong><small>{total ? (item.amount / total * 100).toFixed(1) : "0.0"}%</small></div>)}
      </div>
    </div>
  );
}