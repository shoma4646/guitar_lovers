import { renderHook } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useAnnounceOnChange } from "../useAnnounceOnChange";

describe("useAnnounceOnChange", () => {
  let announceSpy: jest.SpyInstance;

  beforeEach(() => {
    announceSpy = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
    announceSpy.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("文言があれば表示した時点で1回読み上げる", () => {
    renderHook(() => useAnnounceOnChange("練習時間を入力してください"));

    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenCalledWith("練習時間を入力してください");
  });

  it("nullの間は読み上げない", () => {
    renderHook(() => useAnnounceOnChange(null));

    expect(announceSpy).not.toHaveBeenCalled();
  });

  it("同じ文言のまま再描画しても重ねて読み上げない", () => {
    const { rerender } = renderHook(({ message }: { message: string | null }) => useAnnounceOnChange(message), {
      initialProps: { message: "エラーA" },
    });

    rerender({ message: "エラーA" });
    rerender({ message: "エラーA" });

    expect(announceSpy).toHaveBeenCalledTimes(1);
  });

  it("文言が変わったときと、一度消えて同じ文言が出直したときは読み上げる", () => {
    const { rerender } = renderHook(({ message }: { message: string | null }) => useAnnounceOnChange(message), {
      initialProps: { message: "エラーA" },
    });

    rerender({ message: "エラーB" });
    rerender({ message: null });
    rerender({ message: "エラーB" });

    expect(announceSpy.mock.calls).toEqual([["エラーA"], ["エラーB"], ["エラーB"]]);
  });
});
