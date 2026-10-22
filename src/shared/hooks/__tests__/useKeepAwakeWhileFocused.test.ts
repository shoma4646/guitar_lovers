import { act, renderHook } from "@testing-library/react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useKeepAwakeWhileFocused } from "../useKeepAwakeWhileFocused";

jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(async () => undefined),
  deactivateKeepAwake: jest.fn(async () => undefined),
}));

let mockFocused = true;
const mockFocusListeners = new Set<(focused: boolean) => void>();

jest.mock("expo-router", () => {
  const { useEffect, useState } = jest.requireActual("react");
  return {
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

function setFocused(focused: boolean) {
  mockFocused = focused;
  act(() => {
    for (const listener of mockFocusListeners) listener(focused);
  });
}

const activate = activateKeepAwakeAsync as jest.Mock;
const deactivate = deactivateKeepAwake as jest.Mock;

describe("useKeepAwakeWhileFocused", () => {
  beforeEach(() => {
    mockFocused = true;
    mockFocusListeners.clear();
    activate.mockClear();
    deactivate.mockClear();
  });

  it("フォーカス中にactiveになるとtag付きで抑止し、activeでなくなると同じtagで解除する", () => {
    const { rerender } = renderHook(({ active }: { active: boolean }) => useKeepAwakeWhileFocused(active, "tuner"), {
      initialProps: { active: false },
    });
    expect(activate).not.toHaveBeenCalled();

    rerender({ active: true });
    expect(activate).toHaveBeenCalledWith("tuner");

    rerender({ active: false });
    expect(deactivate).toHaveBeenCalledWith("tuner");
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it("画面を離れると解除し、戻ってactiveのままなら再び抑止する", () => {
    renderHook(() => useKeepAwakeWhileFocused(true, "practice"));
    expect(activate).toHaveBeenCalledTimes(1);

    setFocused(false);
    expect(deactivate).toHaveBeenCalledWith("practice");

    setFocused(true);
    expect(activate).toHaveBeenCalledTimes(2);
  });

  it("フォーカスが無ければactiveでも抑止しない", () => {
    mockFocused = false;
    renderHook(() => useKeepAwakeWhileFocused(true, "practice"));

    expect(activate).not.toHaveBeenCalled();
  });

  it("アンマウントで抑止を解除する", () => {
    const { unmount } = renderHook(() => useKeepAwakeWhileFocused(true, "tuner"));

    unmount();

    expect(deactivate).toHaveBeenCalledWith("tuner");
  });

  it("抑止に失敗しても例外を外へ出さない", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    activate.mockRejectedValueOnce(new Error("unavailable"));

    renderHook(() => useKeepAwakeWhileFocused(true, "tuner"));
    await act(async () => {
      await Promise.resolve();
    });

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
