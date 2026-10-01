export const semanticColors = {
  paper: "#FFFFFF",
  surface: "#F5F7FA",
  ink: "#1B2430",
  inkMuted: "#5B6675",
  rule: "#DDE2E8",
  bandRed: "#B3122E",
};

export const categoryColors: Record<string, string> = {
  central: "#33598A",
  receiving: "#2F7D6D",
  local: "#B7862C",
  fund: "#6E5A9A",
  plan: "#3F93B0",
  province: "#8A6A52",
  other: "#8C96A3",
};

export const planTypeColors: Record<string, string> = {
  basic: "#33598A",
  strategic: "#2F7D6D",
  integrated: "#B7862C",
  other: "#8C96A3",
};

export const budgetPalette = Object.values(categoryColors);

export function categoryColor(id: string) {
  return categoryColors[id] ?? categoryColors.other;
}

export function planColor(id: string) {
  return planTypeColors[id] ?? planTypeColors.other;
}

export function contrastTextColor(background: string) {
  const value = background.replace("#", "");
  if (value.length !== 6) return semanticColors.ink;
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  const whiteContrast = 1.05 / (luminance + 0.05);
  const inkChannels = [27, 36, 48].map((channel) => channel / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const inkLuminance = 0.2126 * inkChannels[0] + 0.7152 * inkChannels[1] + 0.0722 * inkChannels[2];
  const inkContrast = (luminance + 0.05) / (inkLuminance + 0.05);
  return whiteContrast >= 4.5 || whiteContrast >= inkContrast ? semanticColors.paper : semanticColors.ink;
}