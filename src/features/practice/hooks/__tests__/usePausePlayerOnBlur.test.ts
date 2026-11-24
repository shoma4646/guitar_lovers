import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { usePausePlayerOnBlur } from "../usePausePlayerOnBlur";

let focusEffect: (() => void | (() => void)) | null = null;

jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    focusEffect = effect;
  },
}));

/** フォーカスを得て、外す。外したときの後片付けまで実行する */
function focusThenBlur(): void {
  const cleanup = focusEffect?.();
  if (typeof cleanup === "function") cleanup();
}

describe("usePausePlayerOnBlur", () => {
  let appStateListener: ((state: AppStateStatus) => void) | null;
  let removeAppStateListener: jest.Mock;

  beforeEach(() => {
    focusEffect = null;
    appStateListener = null;
    removeAppStateListener = jest.fn(() => {
      appStateListener = null;
    });
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      appStateListener = listener as (state: AppStateStatus) => void;
      return { remove: removeAppStateListener } as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("フォーカスが外れたら一時停止を送り、戻っても再生は送らない", () => {
    const sendToPlayer = jest.fn();
    renderHook(() => usePausePlayerOnBlur(sendToPlayer, () => true));

    focusThenBlur();
    expect(sendToPlayer).toHaveBeenCalledTimes(1);
    expect(sendToPlayer).toHaveBeenLastCalledWith({ action: "pause" });

    focusEffect?.();
    expect(sendToPlayer).toHaveBeenCalledTimes(1);
    expect(sendToPlayer).not.toHaveBeenCalledWith({ action: "play" });
  });

  it("動画を読み込む前にフォーカスが外れても何も送らず、エラーにならない", () => {
    const sendToPlayer = jest.fn();
    renderHook(() => usePausePlayerOnBlur(sendToPlayer, () => false));

    expect(() => focusThenBlur()).not.toThrow();
    expect(sendToPlayer).not.toHaveBeenCalled();
  });

  it("動画の有無はフォーカスが外れた時点の値で判定する", () => {
    const sendToPlayer = jest.fn();
    let hasVideo = false;
    renderHook(() => usePausePlayerOnBlur(sendToPlayer, () => hasVideo));

    const cleanup = focusEffect?.();
    hasVideo = true;
    if (typeof cleanup === "function") cleanup();
    expect(sendToPlayer).toHaveBeenCalledWith({ action: "pause" });
  });

  describe("アプリを裏に回したとき", () => {
    it("background に変わると一時停止を1回送り、active に戻っても再生は送らない", () => {
      const sendToPlayer = jest.fn();
      renderHook(() => usePausePlayerOnBlur(sendToPlayer, () => true));
      focusEffect?.();

      act(() => appStateListener?.("background"));
      expect(sendToPlayer).toHaveBeenCalledTimes(1);
      expect(sendToPlayer).toHaveBeenLastCalledWith({ action: "pause" });

      act(() => appStateListener?.("active"));
      expect(sendToPlayer).toHaveBeenCalledTimes(1);
      expect(sendToPlayer).not.toHaveBeenCalledWith({ action: "play" });
    });

    it("動画を読み込む前なら background に変わっても何も送らない", () => {
      const sendToPlayer = jest.fn();
      renderHook(() => usePausePlayerOnBlur(sendToPlayer, () => false));
      focusEffect?.();

      act(() => appStateListener?.("background"));
      expect(sendToPlayer).not.toHaveBeenCalled();
    });

    it("iOS の inactive（コントロールセンター・着信バナー）では送らない", () => {
      const sendToPlayer = jest.fn();
      renderHook(() => usePausePlayerOnBlur(sendToPlayer, () => true));
      focusEffect?.();

      act(() => appStateListener?.("inactive"));
      expect(sendToPlayer).not.toHaveBeenCalled();
    });

    it("動画の有無は background に変わった時点の値で判定する", () => {
      const sendToPlayer = jest.fn();
      let hasVideo = false;
      renderHook(() => usePausePlayerOnBlur(sendToPlayer, () => hasVideo));
      focusEffect?.();

      hasVideo = true;
      act(() => appStateListener?.("background"));
      expect(sendToPlayer).toHaveBeenCalledWith({ action: "pause" });
    });

    it("フォーカスが外れたら購読をやめ、別タブ表示中に裏へ回っても二重に送らない", () => {
      const sendToPlayer = jest.fn();
      renderHook(() => usePausePlayerOnBlur(sendToPlayer, () => true));

      focusThenBlur();
      expect(sendToPlayer).toHaveBeenCalledTimes(1);
      expect(removeAppStateListener).toHaveBeenCalledTimes(1);

      act(() => appStateListener?.("background"));
      expect(sendToPlayer).toHaveBeenCalledTimes(1);
    });
  });
});
