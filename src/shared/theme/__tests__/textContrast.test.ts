import { colors } from "../colors";
import { contrastRatio } from "../contrast";

describe("補助テキストの文字色", () => {
  it.each([
    "surfaceContainerLowest",
    "surface",
    "surfaceContainerLow",
    "surfaceContainer",
  ] as const)("onSurfaceVariant は %s の上で WCAG AA（4.5:1）以上", (bg) => {
    expect(contrastRatio(colors.onSurfaceVariant, colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
