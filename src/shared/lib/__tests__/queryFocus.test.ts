import { AppState, type AppStateStatus } from "react-native";
import { focusManager } from "@tanstack/react-query";
import { connectQueryFocusToAppState } from "../queryFocus";

describe("connectQueryFocusToAppState", () => {
  let listener: ((state: AppStateStatus) => void) | null;
  const remove = jest.fn();

  beforeEach(() => {
    listener = null;
    remove.mockClear();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, fn) => {
      listener = fn as (state: AppStateStatus) => void;
      return { remove } as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    focusManager.setFocused(undefined);
  });

  it("AppStateがactiveになったらfocusManagerへfocusを通知し、背面ではblurを通知する", () => {
    const setFocused = jest.spyOn(focusManager, "setFocused");
    connectQueryFocusToAppState();

    listener?.("background");
    expect(setFocused).toHaveBeenLastCalledWith(false);
    listener?.("active");
    expect(setFocused).toHaveBeenLastCalledWith(true);
    expect(focusManager.isFocused()).toBe(true);
  });

  it("解除関数で購読を外す", () => {
    const disconnect = connectQueryFocusToAppState();
    disconnect();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
