import { colors } from "../colors";

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

describe("補助テキストの文字色", () => {
  it.each([
    "surfaceContainerLowest",
    "surface",
    "surfaceContainerLow",
    "surfaceContainer",
  ] as const)("onSurfaceVariant は %s の上で WCAG AA（4.5:1）以上", (bg) => {
    expect(contrast(colors.onSurfaceVariant, colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
