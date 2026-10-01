"use client";

import { useMemo, useState } from "react";

export type RankedRow = {
  id: string | number;
  label: string;
  name: string;
  typeLabel: string;
  amount: number;
  share: number;
  childCount?: number;
  computed?: boolean;
  color: string;
  path?: string;
};

type Props = {
  rows: RankedRow[];
  totalCount: number;
  totalAmount: number;
  onSelect: (row: RankedRow) => void;
  onShowMore?: () => void;
  hasMore?: boolean;
  compact?: boolean;
  showFooter?: boolean;
  emptyText?: string;
  onClearSearch?: () => void;
  highlightQuery?: string;
};

type SortKey = "label" | "name" | "share" | "amount" | "childCount";
type SortState = { key: SortKey; dir: "asc" | "desc" };

const number = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

function moneyScale(maxValue: number) {
  if (maxValue >= 1_000_000_000_000) return { divisor: 1_000_000_000_000, unit: "ล้านล้านบาท" };
  if (maxValue >= 1_000_000_000) return { divisor: 1_000_000_000, unit: "พันล้านบาท" };
  if (maxValue >= 1_000_000) return { divisor: 1_000_000, unit: "ล้านบาท" };
  return { divisor: 1, unit: "บาท" };
}

function compareRows(a: RankedRow, b: RankedRow, key: SortKey) {
  if (key === "name") return a.name.localeCompare(b.name, "th");
  if (key === "label") return a.label.localeCompare(b.label, "th", { numeric: true });
  const left = key === "childCount" ? a.childCount ?? 0 : a[key];
  const right = key === "childCount" ? b.childCount ?? 0 : b[key];
  return left - right;
}

export default function RankedTable({ rows, totalCount, totalAmount, onSelect, onShowMore, hasMore = false, compact = false, showFooter = true, emptyText = "ไม่พบรายการ", onClearSearch, highlightQuery = "" }: Props) {
  const [sort, setSort] = useState<SortState | null>(null);
  const scale = moneyScale(totalAmount || Math.max(0, ...rows.map((row) => row.amount)));
  const displayMoney = (value: number) => scale.divisor === 1 ? number.format(value) : (value / scale.divisor).toFixed(2);
  const highlight = (text: string) => {
    if (!highlightQuery.trim()) return text;
    const escaped = highlightQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.split(new RegExp(`(${escaped})`, "ig")).map((part, index) => part.toLocaleLowerCase("th") === highlightQuery.toLocaleLowerCase("th") ? <mark key={index}>{part}</mark> : part);
  };
  const displayRows = useMemo(() => {
    if (!sort) return rows;
    const sorted = [...rows].sort((a, b) => compareRows(a, b, sort.key));
    return sort.dir === "asc" ? sorted : sorted.reverse();
  }, [rows, sort]);

  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, dir: key === "name" || key === "label" ? "asc" : "desc" };
      return { key, dir: current.dir === "asc" ? "desc" : "asc" };
    });
  }

  function ariaSortFor(key: SortKey): "ascending" | "descending" | "none" {
    if (sort?.key !== key) return "none";
    return sort.dir === "asc" ? "ascending" : "descending";
  }

  function SortHeader({ children, sortKey }: { children: React.ReactNode; sortKey: SortKey }) {
    const active = sort?.key === sortKey;
    return (
      <button type="button" className={`ranked-sort-btn ${active ? "is-active" : ""}`} onClick={() => toggleSort(sortKey)} aria-label={`เรียงตาม${children}`}>
        <span>{children}</span>
        <i className="ranked-sort-icon" aria-hidden="true">{active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}</i>
      </button>
    );
  }

  return (
    <div className={`ranked-table-wrap ${compact ? "ranked-table-compact" : ""}`}>
      <table className="ranked-table">
        <thead>
          <tr>
            <th className="ranked-label-col" aria-sort={ariaSortFor("label")}><SortHeader sortKey="label">เลขข้อ</SortHeader></th>
            <th aria-sort={ariaSortFor("name")}><SortHeader sortKey="name">ชื่อรายการ</SortHeader></th>
            <th className="ranked-share-col" aria-sort={ariaSortFor("share")}><SortHeader sortKey="share">สัดส่วน</SortHeader></th>
            <th className="ranked-amount-col" aria-sort={ariaSortFor("amount")}><SortHeader sortKey="amount">ยอดเงิน</SortHeader></th>
            <th className="ranked-count-col" aria-sort={ariaSortFor("childCount")}><SortHeader sortKey="childCount">รายการย่อย</SortHeader></th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row) => {
            return <tr key={row.id} onClick={() => onSelect(row)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(row); } }}>
              <td className="ranked-label-col"><span className="ranked-label">{row.label}</span></td>
              <td><button className="ranked-name" type="button" onClick={(event) => { event.stopPropagation(); onSelect(row); }}><span>{highlight(row.name)}</span><small><i style={{ background: row.color }} />{row.typeLabel}{row.computed && <em>คำนวณจากรายการย่อย</em>}</small>{row.path && <small className="ranked-path">{row.path}</small>}</button><div className="ranked-mobile-share"><i><b style={{ width: `${Math.min(Math.max(row.share, 0), 100)}%`, background: row.color }} /></i><span>{row.share.toFixed(2)}%</span></div></td>
              <td className="ranked-share-col"><div className="ranked-share"><i><b style={{ width: `${Math.min(Math.max(row.share, 0), 100)}%`, background: row.color }} /></i><span>{row.share.toFixed(2)}%</span></div></td>
              <td className="ranked-amount-col" title={`${number.format(row.amount)} บาท`}><span className="ranked-money"><b>{displayMoney(row.amount)}</b><small>{scale.unit}</small></span></td>
              <td className="ranked-count-col">{row.childCount === undefined || row.childCount === 0 ? "–" : number.format(row.childCount)}</td>
            </tr>;
          })}
          {!rows.length && <tr><td className="ranked-empty" colSpan={5}>{emptyText}{onClearSearch && <button type="button" onClick={onClearSearch}>ล้างตัวกรอง</button>}</td></tr>}
        </tbody>
        {showFooter && <tfoot><tr><td colSpan={2}>รวมทั้งหมด {number.format(totalCount)} รายการ</td><td className="ranked-share-col">{totalAmount ? "100.0%" : "–"}</td><td className="ranked-amount-col" title={`${number.format(totalAmount)} บาท`}><span className="ranked-money"><b>{displayMoney(totalAmount)}</b><small>{scale.unit}</small></span></td><td className="ranked-count-col">{number.format(totalCount)}</td></tr></tfoot>}
      </table>
      {hasMore && onShowMore && <button className="ranked-show-more" type="button" onClick={onShowMore}>แสดงรายการเพิ่ม</button>}
    </div>
  );
}
