import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { NeedleMeter } from "../NeedleMeter";
import { TUNING_THRESHOLD_CENTS } from "@/shared/constants/tuning";
import { METER_MAX_CENTS } from "@/features/tuner/lib/meter";

function styleOf(testID: string): ViewStyle {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style);
}

/** 枠の下端から見た、要素の上端の高さ（bottom基準で配置した要素用） */
function topFromFrameBottom(style: ViewStyle): number {
  return Number(style.bottom) + Number(style.height);
}

describe("NeedleMeter の寸法", () => {
  beforeEach(() => {
    render(<NeedleMeter cents={0} hasSignal={false} state="in" />);
  });

  it("表示枠の高さが円の半径＋線の太さ以上ある", () => {
    const frame = styleOf("needle-meter");
    const ring = styleOf("needle-meter-ring");
    const radius = Number(ring.width) / 2;
    expect(Number(frame.height)).toBeGreaterThanOrEqual(radius + Number(ring.borderWidth));
  });

  it("円弧の頂点と中央の緑の帯が表示枠の中に収まる（切り取られない）", () => {
    const frameHeight = Number(styleOf("needle-meter").height);
    expect(topFromFrameBottom(styleOf("needle-meter-ring"))).toBeLessThanOrEqual(frameHeight);
    expect(topFromFrameBottom(styleOf("needle-meter-in-tune-band"))).toBeLessThanOrEqual(frameHeight);
  });
});

describe("NeedleMeter の横幅への追従", () => {
  /** ±TUNING_THRESHOLD_CENTSを±60度換算した角度に対する、直径あたりの中央帯の弦幅 */
  const BAND_WIDTH_PER_DIAMETER = Math.sin(
    (TUNING_THRESHOLD_CENTS / METER_MAX_CENTS) * 60 * (Math.PI / 180),
  );

  function layoutFrame(width: number) {
    fireEvent(screen.getByTestId("needle-meter"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 140 } },
    });
  }

  beforeEach(() => {
    render(<NeedleMeter cents={0} hasSignal={false} state="in" />);
  });

  it("枠幅が248なら円の直径が248以下になり、中央帯の幅と枠の高さも同じ比率で縮む", () => {
    const before = {
      diameter: Number(styleOf("needle-meter-ring").width),
      band: Number(styleOf("needle-meter-in-tune-band").width),
    };

    layoutFrame(248);

    const ring = styleOf("needle-meter-ring");
    const diameter = Number(ring.width);
    expect(diameter).toBeLessThanOrEqual(248);
    expect(Number(ring.height)).toBe(diameter);
    const band = Number(styleOf("needle-meter-in-tune-band").width);
    expect(band / diameter).toBeCloseTo(before.band / before.diameter, 10);
    expect(band).toBeCloseTo(diameter * BAND_WIDTH_PER_DIAMETER, 10);
    expect(Number(styleOf("needle-meter").height)).toBe(diameter / 2 + Number(ring.borderWidth));
  });

  it("枠幅が248でも円弧の頂点と中央帯が枠の高さに収まる", () => {
    layoutFrame(248);

    const frameHeight = Number(styleOf("needle-meter").height);
    expect(topFromFrameBottom(styleOf("needle-meter-ring"))).toBeLessThanOrEqual(frameHeight);
    expect(topFromFrameBottom(styleOf("needle-meter-in-tune-band"))).toBeLessThanOrEqual(frameHeight);
  });

  it("針の長さも直径と同じ比率で縮む", () => {
    const before = Number(styleOf("needle-meter-needle").height);

    layoutFrame(128);

    expect(Number(styleOf("needle-meter-needle").height)).toBeCloseTo(before / 2, 10);
  });

  it("枠幅が256より広くても直径は256のまま", () => {
    layoutFrame(400);

    expect(Number(styleOf("needle-meter-ring").width)).toBe(256);
  });
});
