import { budgetPalette, semanticColors } from "./colors";

export const echartsTheme = {
  color: budgetPalette,
  textStyle: { fontFamily: '"IBM Plex Sans Thai", "Noto Sans Thai", "Leelawadee UI", "Thonburi", sans-serif', color: semanticColors.ink },
  tooltip: {
    backgroundColor: semanticColors.paper,
    borderColor: semanticColors.rule,
    borderWidth: 1,
    textStyle: { color: semanticColors.ink, fontSize: 13 },
    extraCssText: "box-shadow: 0 4px 14px rgba(27,36,48,.12); border-radius: 6px;",
  },
  categoryAxis: { axisLine: { lineStyle: { color: semanticColors.rule } }, axisTick: { lineStyle: { color: semanticColors.rule } }, axisLabel: { color: semanticColors.inkMuted }, splitLine: { show: false } },
  valueAxis: { axisLine: { lineStyle: { color: semanticColors.rule } }, axisTick: { lineStyle: { color: semanticColors.rule } }, axisLabel: { color: semanticColors.inkMuted }, splitLine: { lineStyle: { color: semanticColors.rule } } },
};
