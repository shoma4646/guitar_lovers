import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";
import { useVideoPresets } from "../useVideoPresets";

jest.mock("../../../../../assets/json/practice_presets.json", () => [
  { id: "preset-1", videoId: "BBz-Jyr23M4", title: "コード練習", category: "chord" },
  { id: "preset-2", videoId: "VmGitmNspA", title: "IDが10文字", category: "scale" },
  { id: "preset-3", videoId: "KcOOskMSqeY", title: "アルペジオ", category: "fingerpicking" },
]);

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>;
}

describe("useVideoPresets", () => {
  it("1件だけ壊れていても、残りの見本動画は返し、壊れた要素はエラーログに出す", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useVideoPresets(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((p) => p.id)).toEqual(["preset-1", "preset-3"]);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});
