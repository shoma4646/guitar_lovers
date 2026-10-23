import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { useLocalDay } from "../useLocalDay";

describe("useLocalDay", () => {
  let appStateListener: ((state: AppStateStatus) => void) | null;

  beforeEach(() => {
    appStateListener = null;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      appStateListener = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("23:59から0:00をまたぐと値が翌日に変わり、さらに翌日の0:00でも変わる", () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 22, 23, 59, 0) });
    const { result } = renderHook(() => useLocalDay());
    expect(result.current).toBe("2026-10-22");

    act(() => {
      jest.advanceTimersByTime(59_000);
    });
    expect(result.current).toBe("2026-10-22");

    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    expect(result.current).toBe("2026-10-23");

    act(() => {
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    });
    expect(result.current).toBe("2026-10-24");
  });

  it("前面に戻った時点で日付が変わっていれば値も変わる", () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 22, 21, 0, 0) });
    const { result } = renderHook(() => useLocalDay());
    expect(result.current).toBe("2026-10-22");

    // バックグラウンド中はJSのタイマーが止まる想定で、時計だけを翌日へ進める
    jest.setSystemTime(new Date(2026, 9, 23, 20, 0, 0));
    act(() => appStateListener?.("background"));
    expect(result.current).toBe("2026-10-22");

    act(() => appStateListener?.("active"));
    expect(result.current).toBe("2026-10-23");
  });
});
