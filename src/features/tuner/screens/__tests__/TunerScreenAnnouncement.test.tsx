import { act, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import type { PitchDetectorState } from "@/features/tuner/hooks/usePitchDetector";
import { TunerScreen } from "../TunerScreen";

jest.mock("@/shared/components/molecules/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/shared/hooks/useKeepAwakeWhileFocused", () => ({
  useKeepAwakeWhileFocused: () => {},
}));

let mockDetector: PitchDetectorState;
jest.mock("@/features/tuner/hooks/usePitchDetector", () => ({
  usePitchDetector: () => mockDetector,
}));

function detector(hz: number | null): PitchDetectorState {
  return {
    status: "listening",
    hz,
    clarity: hz === null ? 0 : 0.99,
    inputLevelDb: -30,
    pausedByUser: false,
    pause: jest.fn(),
    resume: jest.fn(),
  };
}

/** A2（5弦）より低い・ちょうど・高い周波数 */
const FLAT_5 = 107;
const IN_5 = 110;
const SHARP_5 = 113;

let announceSpy: jest.SpyInstance;

async function renderWith(hz: number | null, screenReaderEnabled: boolean) {
  jest.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockResolvedValue(screenReaderEnabled);
  mockDetector = detector(hz);
  const utils = render(<TunerScreen />);
  await act(async () => {});
  return utils;
}

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

describe("TunerScreen の判定の読み上げ", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    announceSpy = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
    announceSpy.mockClear();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("判定の表示に弦番号が含まれる", async () => {
    await renderWith(FLAT_5, false);
    expect(screen.getByText("5弦: 低い・少し締める")).toBeTruthy();
  });

  it("判定が切り替わったら弦番号付きで1回読み、同じ判定が続く間は読まない", async () => {
    const { rerender } = await renderWith(FLAT_5, true);
    advance(500);
    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenLastCalledWith("5弦: 低い・少し締める");

    mockDetector = detector(FLAT_5 - 0.5);
    rerender(<TunerScreen />);
    advance(1000);
    expect(announceSpy).toHaveBeenCalledTimes(1);

    mockDetector = detector(SHARP_5);
    rerender(<TunerScreen />);
    advance(500);
    expect(announceSpy).toHaveBeenCalledTimes(2);
    expect(announceSpy).toHaveBeenLastCalledWith("5弦: 高い・少し緩める");
  });

  it("0.5秒以内に揺れて元に戻った判定は読まない", async () => {
    const { rerender } = await renderWith(FLAT_5, true);
    advance(500);
    expect(announceSpy).toHaveBeenCalledTimes(1);

    mockDetector = detector(SHARP_5);
    rerender(<TunerScreen />);
    advance(200);
    mockDetector = detector(FLAT_5);
    rerender(<TunerScreen />);
    advance(1000);
    expect(announceSpy).toHaveBeenCalledTimes(1);
  });

  it("弦が合ったら「合いました」を1回だけ読む", async () => {
    const { rerender } = await renderWith(FLAT_5, true);
    advance(500);
    expect(announceSpy).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 5; i++) {
      mockDetector = detector(i % 2 === 0 ? IN_5 : IN_5 + 0.1);
      rerender(<TunerScreen />);
      advance(300);
    }
    expect(announceSpy).toHaveBeenCalledTimes(2);
    expect(announceSpy).toHaveBeenLastCalledWith("5弦: 合いました");
  });

  it("スクリーンリーダーが無効なときは読まない", async () => {
    const { rerender } = await renderWith(FLAT_5, false);
    advance(500);
    mockDetector = detector(SHARP_5);
    rerender(<TunerScreen />);
    advance(500);
    expect(announceSpy).not.toHaveBeenCalled();
  });
});
