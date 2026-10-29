import { act, renderHook } from "@testing-library/react-native";
import { usePracticeStore } from "@/stores/practice";
import { useStopMetronomeOnBlur } from "../useStopMetronomeOnBlur";

let focusEffect: (() => void | (() => void)) | null = null;

jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    focusEffect = effect;
  },
}));

/** フォーカスを得て、外す。外したときの後片付けまで実行する */
function focusThenBlur(): void {
  const cleanup = focusEffect?.();
  if (typeof cleanup === "function") act(() => cleanup());
}

describe("useStopMetronomeOnBlur", () => {
  beforeEach(() => {
    focusEffect = null;
    usePracticeStore.getState().setMetronomeEnabled(true);
  });

  it("フォーカスが外れたらメトロノームをOFFにする", () => {
    renderHook(() => useStopMetronomeOnBlur());

    focusThenBlur();
    expect(usePracticeStore.getState().metronomeEnabled).toBe(false);
  });

  it("フォーカスが戻ってもONに戻さない", () => {
    renderHook(() => useStopMetronomeOnBlur());

    focusThenBlur();
    act(() => {
      focusEffect?.();
    });
    expect(usePracticeStore.getState().metronomeEnabled).toBe(false);
  });

  it("動画を読み込む前（store に動画が無い状態）でもエラーにならずOFFになる", () => {
    expect(usePracticeStore.getState().loadedVideoId).toBeNull();
    renderHook(() => useStopMetronomeOnBlur());

    expect(() => focusThenBlur()).not.toThrow();
    expect(usePracticeStore.getState().metronomeEnabled).toBe(false);
  });
});
