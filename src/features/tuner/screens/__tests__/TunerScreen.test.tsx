import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { AppState, StyleSheet, type AppStateStatus } from "react-native";
import { semantic } from "@/shared/theme/semantic";
import { NUMERIC_MAX_FONT_SIZE_MULTIPLIER } from "@/shared/constants/layout";
import type { PitchDetectorState } from "@/features/tuner/hooks/usePitchDetector";
import { TunerScreen } from "../TunerScreen";

jest.mock("@/shared/components/molecules/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children: React.ReactNode }) => children,
}));
let mockFocused = true;
const mockFocusListeners = new Set<(focused: boolean) => void>();
jest.mock("expo-router", () => {
  const { useEffect, useState } = jest.requireActual("react");
  return {
    useRouter: () => ({ push: jest.fn() }),
    // フォーカス状態をテストから切り替えられるuseFocusEffectの代用
    useFocusEffect: (effect: () => void | (() => void)) => {
      const [focused, setFocused] = useState(mockFocused);
      useEffect(() => {
        mockFocusListeners.add(setFocused);
        return () => {
          mockFocusListeners.delete(setFocused);
        };
      }, []);
      useEffect(() => (focused ? effect() : undefined), [focused, effect]);
    },
  };
});
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

describe("TunerScreen の弦のマス", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  /** 半音下げに切り替え、6弦（Eb2）を合わせた音を0.5秒聞かせてチューニング済みにする */
  function tuneLowEbString() {
    mockDetector = detector(null);
    const { rerender } = render(<TunerScreen />);
    fireEvent.press(screen.getByText("半音下げ"));
    mockDetector = detector(77.78);
    rerender(<TunerScreen />);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    return screen.getByLabelText("6弦 Eb2 チューニング完了");
  }

  it("チューニング済みの✓は音名と同じ行に並べず、マスの角に重ねて置く", () => {
    const cell = tuneLowEbString();

    const check = within(cell).getByTestId("string-tuned-check");
    expect(StyleSheet.flatten(check.props.style).position).toBe("absolute");
    expect(check.parent?.parent).toBe(cell);
  });

  it("音名と弦番号は1行に収め、文字サイズの拡大に上限を付ける", () => {
    const cell = tuneLowEbString();

    for (const text of [within(cell).getByText("Eb2"), within(cell).getByText("6弦")]) {
      expect(text.props.numberOfLines).toBe(1);
      expect(text.props.maxFontSizeMultiplier).toBe(NUMERIC_MAX_FONT_SIZE_MULTIPLIER);
    }
  });

  it("チューニング前のマスには✓を出さない", () => {
    mockDetector = detector(null);
    render(<TunerScreen />);

    expect(screen.queryByTestId("string-tuned-check")).toBeNull();
  });
});

describe("TunerScreen の✓は「今合っている」弦だけに付ける", () => {
  /** スタンダードの6弦〜1弦にちょうど合う周波数 */
  const STANDARD_IN_TUNE_HZ = [82.41, 110, 146.83, 196, 246.94, 329.63];
  /** A2（5弦）より約-16 cents低い周波数 */
  const FLAT_5 = 109;
  const IN_5 = 110;

  let appStateListeners: Set<(state: AppStateStatus) => void>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockFocused = true;
    mockFocusListeners.clear();
    appStateListeners = new Set();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      const typed = listener as (state: AppStateStatus) => void;
      appStateListeners.add(typed);
      return { remove: () => appStateListeners.delete(typed) } as ReturnType<typeof AppState.addEventListener>;
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function advance(ms: number) {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  }

  function setFocused(focused: boolean) {
    mockFocused = focused;
    act(() => {
      for (const listener of mockFocusListeners) listener(focused);
    });
  }

  function emitAppState(state: AppStateStatus) {
    act(() => {
      for (const listener of appStateListeners) listener(state);
    });
  }

  function hear(rerender: (ui: React.ReactElement) => void, hz: number | null) {
    mockDetector = detector(hz);
    rerender(<TunerScreen />);
  }

  /** 6本すべてを0.5秒ずつ合わせてから音を止める */
  function tuneAllStrings() {
    mockDetector = detector(null);
    const utils = render(<TunerScreen />);
    for (const hz of STANDARD_IN_TUNE_HZ) {
      hear(utils.rerender, hz);
      advance(500);
    }
    hear(utils.rerender, null);
    expect(screen.getAllByTestId("string-tuned-check")).toHaveLength(6);
    return utils;
  }

  it("全弦✓の状態からタブを離れて戻ると、全弦が未チューニングに戻る", () => {
    tuneAllStrings();

    setFocused(false);
    setFocused(true);

    expect(screen.queryByTestId("string-tuned-check")).toBeNull();
    expect(screen.getByLabelText("6弦 E2 未チューニング")).toBeTruthy();
    expect(screen.getByLabelText("1弦 E4 未チューニング")).toBeTruthy();
  });

  it("アプリがバックグラウンドから前面に戻ると、全弦が未チューニングに戻る", () => {
    tuneAllStrings();

    emitAppState("background");
    emitAppState("active");

    expect(screen.queryByTestId("string-tuned-check")).toBeNull();
  });

  it("コントロールセンターを開いたときのような inactive からの復帰では✓を外さない", () => {
    tuneAllStrings();

    emitAppState("inactive");
    emitAppState("active");

    expect(screen.getAllByTestId("string-tuned-check")).toHaveLength(6);
  });

  it("✓の弦で許容範囲外が1秒続くと✓が外れる", () => {
    const { rerender } = tuneAllStrings();

    hear(rerender, FLAT_5);
    advance(999);
    expect(screen.getByLabelText("5弦 A2 チューニング完了")).toBeTruthy();

    advance(1);
    expect(screen.getByLabelText("5弦 A2 未チューニング")).toBeTruthy();
    expect(screen.getAllByTestId("string-tuned-check")).toHaveLength(5);
  });

  it("0.5秒以内の揺れを繰り返しても✓は外れない", () => {
    const { rerender } = tuneAllStrings();

    for (let i = 0; i < 4; i++) {
      hear(rerender, FLAT_5);
      advance(500);
      hear(rerender, IN_5);
      advance(100);
    }

    expect(screen.getByLabelText("5弦 A2 チューニング完了")).toBeTruthy();
  });

  it("ずれた音が途切れて無音になった時間は、ずれが続いた時間に数えない", () => {
    const { rerender } = tuneAllStrings();

    hear(rerender, FLAT_5);
    advance(600);
    hear(rerender, null);
    advance(1000);
    hear(rerender, FLAT_5);
    advance(600);

    expect(screen.getByLabelText("5弦 A2 チューニング完了")).toBeTruthy();
  });

  it("✓が外れた弦は、もう一度0.5秒合わせると✓に戻る", () => {
    const { rerender } = tuneAllStrings();
    hear(rerender, FLAT_5);
    advance(1000);
    expect(screen.getByLabelText("5弦 A2 未チューニング")).toBeTruthy();

    hear(rerender, IN_5);
    advance(500);

    expect(screen.getByLabelText("5弦 A2 チューニング完了")).toBeTruthy();
  });
});
