import { act, renderHook } from "@testing-library/react-native";
import { useRunAfterDismiss } from "../useRunAfterDismiss";

describe("useRunAfterDismiss", () => {
  it("予約した操作はflushまで実行されず、flushで1回だけ実行される", () => {
    const { result } = renderHook(() => useRunAfterDismiss());
    const next = jest.fn();

    act(() => result.current.schedule(next));
    expect(next).not.toHaveBeenCalled();

    act(() => result.current.flush());
    act(() => result.current.flush());
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("予約が無ければflushしても何もしない", () => {
    const { result } = renderHook(() => useRunAfterDismiss());
    expect(() => act(() => result.current.flush())).not.toThrow();
  });

  it("再描画をまたいでも予約は保たれる", () => {
    const { result, rerender } = renderHook(() => useRunAfterDismiss());
    const next = jest.fn();

    act(() => result.current.schedule(next));
    rerender({});
    act(() => result.current.flush());

    expect(next).toHaveBeenCalledTimes(1);
  });
});
