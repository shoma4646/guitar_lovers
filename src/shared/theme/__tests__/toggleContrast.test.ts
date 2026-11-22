import { colors } from "../colors";
import { contrastRatio } from "../contrast";
import { toggleColors } from "@/shared/components/atoms/Toggle";

const NON_TEXT_MIN = 3;

describe("トグルスイッチの色（非テキストのUI部品）", () => {
  it.each([
    ["OFFのトラック", "trackOff"],
    ["ONのトラック", "trackOn"],
  ] as const)("%s はカードの白に対して 3:1 以上", (_label, key) => {
    expect(contrastRatio(toggleColors[key], colors.surfaceContainerLowest)).toBeGreaterThanOrEqual(NON_TEXT_MIN);
  });

  it.each([
    ["OFF", "trackOff"],
    ["ON", "trackOn"],
  ] as const)("%s のつまみはトラックに対して 3:1 以上", (_label, key) => {
    expect(contrastRatio(toggleColors.thumb, toggleColors[key])).toBeGreaterThanOrEqual(NON_TEXT_MIN);
  });
});
