import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { semantic } from "@/shared/theme/semantic";
import { NUMERIC_MAX_FONT_SIZE_MULTIPLIER } from "@/shared/constants/layout";
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

function noteStyle() {
  return StyleSheet.flatten(screen.getByTestId("tuner-note").props.style);
}

describe("TunerScreen の音名表示", () => {
  it("未検出のときは大きな「--」を出さず、小さな記号と読み上げ用の説明を出す", () => {
    mockDetector = detector(null);
    render(<TunerScreen />);

    expect(screen.queryByText("--")).toBeNull();
    expect(screen.getByTestId("tuner-note").props.accessibilityLabel).toBe("音を検出していません");
    expect(noteStyle().fontSize).toBeLessThan(88);
    expect(noteStyle().color).toBe(semantic.tunerIdle);
  });

  it("合っているときは in-tune 色、ずれているときは off 色で音名を描く", () => {
    mockDetector = detector(110);
    const { rerender } = render(<TunerScreen />);
    expect(screen.getByTestId("tuner-note").props.children).toBe("A2");
    expect(noteStyle().color).toBe(semantic.tunerInTune);

    mockDetector = detector(113);
    rerender(<TunerScreen />);
    expect(noteStyle().color).toBe(semantic.tunerOff);
  });

  it("どの弦にも近くない音は、針と同じく未検出（idle）色で描く", () => {
    mockDetector = detector(1000);
    render(<TunerScreen />);
    expect(screen.getByText("近い弦が見つかりません")).toBeTruthy();
    expect(noteStyle().fontSize).toBe(88);
    expect(noteStyle().color).toBe(semantic.tunerIdle);
  });
});

describe("TunerScreen の文字サイズ拡大", () => {
  it("検出した音名は文字サイズの拡大に上限を付ける", () => {
    mockDetector = detector(110);
    render(<TunerScreen />);
    expect(screen.getByTestId("tuner-note").props.maxFontSizeMultiplier).toBe(NUMERIC_MAX_FONT_SIZE_MULTIPLIER);
  });
});

describe("TunerScreen の一時停止・エラーからの再開", () => {
  it("一時停止中は「再開する」ボタンを出し、押すと resume を呼ぶ", () => {
    mockDetector = { ...detector(null), status: "idle", pausedByUser: true };
    render(<TunerScreen />);

    fireEvent.press(screen.getByRole("button", { name: "再開する" }));

    expect(mockDetector.resume).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "もう一度試す" })).toBeNull();
  });

  it("マイクエラーのときは「もう一度試す」ボタンを出し、押すと resume を呼ぶ", () => {
    mockDetector = { ...detector(null), status: "error" };
    render(<TunerScreen />);

    fireEvent.press(screen.getByRole("button", { name: "もう一度試す" }));

    expect(mockDetector.resume).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "再開する" })).toBeNull();
  });

  it.each(["listening", "requesting", "denied"] as const)(
    "%s のときはどちらのボタンも出さない",
    (status) => {
      mockDetector = { ...detector(110), status };
      render(<TunerScreen />);

      expect(screen.queryByRole("button", { name: "再開する" })).toBeNull();
      expect(screen.queryByRole("button", { name: "もう一度試す" })).toBeNull();
    },
  );

  it.each([
    [{ status: "listening", pausedByUser: false }, "マイク入力中", "タップで一時停止"],
    [{ status: "idle", pausedByUser: true }, "一時停止中", "タップで再開"],
    [{ status: "error", pausedByUser: false }, "マイクエラー", "タップで再試行"],
  ] as const)("マイク状態チップは %o のとき「%s」に「%s」のヒントを付ける", (state, label, hint) => {
    mockDetector = { ...detector(null), ...state };
    render(<TunerScreen />);

    expect(screen.getByRole("button", { name: label }).props.accessibilityHint).toBe(hint);
  });
});
