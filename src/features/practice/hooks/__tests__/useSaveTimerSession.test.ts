import { act, renderHook } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";
import { useSaveTimerSession } from "../useSaveTimerSession";

const mockSaveSession = jest.fn();

jest.mock("@/features/progress/api/useSavePracticeSession", () => ({
  useSavePracticeSession: () => ({ mutateAsync: mockSaveSession }),
}));

function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useSaveTimerSession", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSaveSession.mockReset();
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it("同じイベントループ内で2回呼んでも保存は1件だけ", async () => {
    const pending = deferred();
    mockSaveSession.mockReturnValue(pending.promise);
    const onSaved = jest.fn();
    const { result } = renderHook(() =>
      useSaveTimerSession({ seconds: 900, videoId: "vid", onSaved }),
    );

    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.saveTimerSession();
      second = result.current.saveTimerSession();
    });
    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      pending.resolve();
      await Promise.all([first, second]);
    });

    expect(mockSaveSession).toHaveBeenCalledTimes(1);
    expect(mockSaveSession.mock.calls[0][0]).toMatchObject({ duration: 900, videoId: "vid" });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(false);
  });

  it("0秒では保存せず「記録する練習時間がありません」と案内する", async () => {
    const onSaved = jest.fn();
    const { result } = renderHook(() =>
      useSaveTimerSession({ seconds: 0, videoId: null, onSaved }),
    );

    await act(async () => {
      await result.current.saveTimerSession();
    });

    expect(mockSaveSession).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(expect.any(String), "記録する練習時間がありません");
  });

  it("30秒未満の確認中にもう一度押しても確認は1回だけで、記録すると保存は1件", async () => {
    mockSaveSession.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSaveTimerSession({ seconds: 10, videoId: null, onSaved: jest.fn() }),
    );

    await act(async () => {
      await result.current.saveTimerSession();
      await result.current.saveTimerSession();
    });

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const buttons = alertSpy.mock.calls[0][2] as AlertButton[];
    await act(async () => {
      buttons.find((b) => b.text === "記録する")!.onPress!();
    });

    expect(mockSaveSession).toHaveBeenCalledTimes(1);
  });

  it("30秒未満の確認をキャンセルすると、もう一度記録できる", async () => {
    const { result } = renderHook(() =>
      useSaveTimerSession({ seconds: 10, videoId: null, onSaved: jest.fn() }),
    );

    await act(async () => {
      await result.current.saveTimerSession();
    });
    const buttons = alertSpy.mock.calls[0][2] as AlertButton[];
    act(() => {
      buttons.find((b) => b.style === "cancel")!.onPress!();
    });
    await act(async () => {
      await result.current.saveTimerSession();
    });

    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it("保存に失敗しても例外を外へ出さず、ボタンは押せる状態に戻る", async () => {
    mockSaveSession.mockRejectedValue(new Error("disk full"));
    const onSaved = jest.fn();
    const { result } = renderHook(() =>
      useSaveTimerSession({ seconds: 900, videoId: null, onSaved }),
    );

    await act(async () => {
      await expect(result.current.saveTimerSession()).resolves.toBeUndefined();
    });

    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });
});
