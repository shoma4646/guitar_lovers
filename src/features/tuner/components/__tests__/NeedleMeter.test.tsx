import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { NeedleMeter } from "../NeedleMeter";

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
