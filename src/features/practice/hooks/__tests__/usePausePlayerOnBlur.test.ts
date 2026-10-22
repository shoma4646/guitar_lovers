import { renderHook } from "@testing-library/react-native";
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
  beforeEach(() => {
    focusEffect = null;
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
});
