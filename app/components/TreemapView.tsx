"use client";

import { useMemo } from "react";
import * as echarts from "echarts";
import ReactECharts from "echarts-for-react";
import { budgetPalette, contrastTextColor, semanticColors } from "../theme/colors";
import { echartsTheme } from "../theme/echarts";
import type { BudgetBandItem } from "./BudgetBand";

type Props = { items: BudgetBandItem[]; total: number; onSelect: (item: BudgetBandItem) => void };
type TooltipData = { name?: string; value?: number; data?: { share?: number } };

echarts.registerTheme("budget-document", echartsTheme);
const formatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

export default function TreemapView({ items, total, onSelect }: Props) {
  const option = useMemo(() => ({
    animation: false,
    tooltip: {
      formatter: (params: unknown) => {
        const item = (Array.isArray(params) ? params[0] : params) as TooltipData;
        return `<strong>${item.name ?? ""}</strong><br/>${formatter.format(Number(item.value ?? 0))} บาท<br/>${Number(item.data?.share ?? 0).toFixed(2)}%`;
      },
    },
    series: [{
      type: "treemap",
      roam: false,
      nodeClick: false,
      breadcrumb: { show: false },
      data: items.map((item) => ({
        id: item.id,
        name: item.label,
        value: item.amount,
        share: total ? item.amount / total * 100 : 0,
        itemStyle: { color: item.color, borderColor: semanticColors.paper, borderWidth: 2, gapWidth: 2 },
        label: { color: contrastTextColor(item.color) },
      })),
      label: {
        show: true,
        color: semanticColors.paper,
        fontFamily: '"IBM Plex Sans Thai", sans-serif',
        fontSize: 14,
        lineHeight: 20,
        formatter: (params: unknown) => {
          const item = (Array.isArray(params) ? params[0] : params) as TooltipData;
          return `${item.name ?? ""}\n${Number(item.data?.share ?? 0).toFixed(1)}%`;
        },
      },
      upperLabel: { show: false },
      levels: [{ itemStyle: { borderColor: semanticColors.paper, borderWidth: 2, gapWidth: 2 } }],
      emphasis: { itemStyle: { borderColor: semanticColors.bandRed, borderWidth: 3 } },
    }],
    color: budgetPalette,
  }), [items, total]);

  return <div className="treemap-view" role="img" aria-label="แผนภาพสัดส่วนงบประมาณ"><ReactECharts theme="budget-document" option={option} style={{ height: 390, width: "100%" }} notMerge onEvents={{ click: (event: { data?: { id?: string } }) => { const item = items.find((entry) => entry.id === event.data?.id); if (item) onSelect(item); } }} /></div>;
}