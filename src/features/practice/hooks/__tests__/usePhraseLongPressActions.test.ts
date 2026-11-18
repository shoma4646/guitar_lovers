import { act, renderHook } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";
import { usePracticeStore } from "@/stores/practice";
import type { PracticePhrase } from "@/shared/types/models";
import { usePhraseLongPressActions } from "../usePhraseLongPressActions";

type MutateOptions = { onSuccess?: () => void };

const mockArchive = jest.fn<void, [string, MutateOptions?]>();
const mockDelete = jest.fn<void, [string, MutateOptions?]>();

jest.mock("@/features/practice/api/useArchivePracticePhrase", () => ({
  useArchivePracticePhrase: () => ({ mutate: mockArchive }),
}));
jest.mock("@/features/practice/api/useDeletePracticePhrase", () => ({
  useDeletePracticePhrase: () => ({ mutate: mockDelete }),
}));

function makePhrase(id: string, name: string): PracticePhrase {
  return {
    id,
    videoId: "abc123def45",
    videoTitle: "動画",
    name,
    startSec: 0,
    endSec: 10,
    currentBpm: 100,
    targetBpm: 140,
    playbackRate: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

const activePhrase = makePhrase("p-active", "練習中のフレーズ");
const otherPhrase = makePhrase("p-other", "別のフレーズ");

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  mockArchive.mockReset();
  mockDelete.mockReset();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  usePracticeStore.setState({
    activePhrasePractice: {
      phrase: activePhrase,
      goalBpm: 100,
      targetReps: 3,
      completedReps: 1,
      startedAt: 0,
    },
    pendingAttemptId: "attempt-1",
  });
});

afterEach(() => {
  alertSpy.mockRestore();
});

function lastAlertButtons(): AlertButton[] {
  const calls = alertSpy.mock.calls;
  return calls[calls.length - 1][2] as AlertButton[];
}

function pressAlertButton(text: string) {
  const button = lastAlertButtons().find((b) => b.text === text);
  if (!button) throw new Error(`「${text}」ボタンが見つからない`);
  act(() => button.onPress?.());
}

function openConfirm(phrase: PracticePhrase, action: "archive" | "delete") {
  const { result } = renderHook(() => usePhraseLongPressActions());
  act(() => result.current(phrase, action));
}

function runOnSuccess(mutate: jest.Mock<void, [string, MutateOptions?]>) {
  act(() => mutate.mock.calls[0][1]?.onSuccess?.());
}

function expectStillActive() {
  const state = usePracticeStore.getState();
  expect(state.activePhrasePractice?.phrase.id).toBe(activePhrase.id);
  expect(state.pendingAttemptId).toBe("attempt-1");
}

function expectCleared() {
  const state = usePracticeStore.getState();
  expect(state.activePhrasePractice).toBeNull();
  expect(state.pendingAttemptId).toBeNull();
}

describe("確認ダイアログのボタンと処理の対応", () => {
  it("「アーカイブする」はarchiveだけを対象IDで呼び、deleteは呼ばない", () => {
    openConfirm(otherPhrase, "archive");
    pressAlertButton("アーカイブする");

    expect(mockArchive).toHaveBeenCalledTimes(1);
    expect(mockArchive.mock.calls[0][0]).toBe(otherPhrase.id);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("「削除する」はdeleteだけを対象IDで呼び、archiveは呼ばない", () => {
    openConfirm(otherPhrase, "delete");
    pressAlertButton("削除する");

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete.mock.calls[0][0]).toBe(otherPhrase.id);
    expect(mockArchive).not.toHaveBeenCalled();
  });

  it.each(["archive", "delete"] as const)("%sの確認で「キャンセル」を押すと何も呼ばれない", (action) => {
    openConfirm(activePhrase, action);
    pressAlertButton("キャンセル");

    expect(mockArchive).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expectStillActive();
  });

  it("長押しメニューから「アーカイブ」→「アーカイブする」と進むとarchiveが呼ばれる", () => {
    const { result } = renderHook(() => usePhraseLongPressActions());
    act(() => result.current(otherPhrase));
    pressAlertButton("アーカイブ");
    pressAlertButton("アーカイブする");

    expect(mockArchive).toHaveBeenCalledTimes(1);
    expect(mockArchive.mock.calls[0][0]).toBe(otherPhrase.id);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("長押しメニューから「削除」→「削除する」と進むとdeleteが呼ばれる", () => {
    const { result } = renderHook(() => usePhraseLongPressActions());
    act(() => result.current(otherPhrase));
    pressAlertButton("削除");
    pressAlertButton("削除する");

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete.mock.calls[0][0]).toBe(otherPhrase.id);
    expect(mockArchive).not.toHaveBeenCalled();
  });

  it("長押しメニューで「キャンセル」を押すと何も呼ばれない", () => {
    const { result } = renderHook(() => usePhraseLongPressActions());
    act(() => result.current(otherPhrase));
    pressAlertButton("キャンセル");

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(mockArchive).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe.each([
  ["archive", "アーカイブする", mockArchive],
  ["delete", "削除する", mockDelete],
] as const)("%s成功後の練習中状態", (action, confirmText, mutate) => {
  it("練習中のフレーズなら練習中状態と記録中IDが解除される", () => {
    openConfirm(activePhrase, action);
    pressAlertButton(confirmText);
    expectStillActive();

    runOnSuccess(mutate);
    expectCleared();
  });

  it("練習中でない別のフレーズなら練習中状態は残る", () => {
    openConfirm(otherPhrase, action);
    pressAlertButton(confirmText);
    runOnSuccess(mutate);

    expectStillActive();
  });

  it("失敗してonSuccessが呼ばれなければ練習中状態は残る", () => {
    openConfirm(activePhrase, action);
    pressAlertButton(confirmText);

    expect(mutate).toHaveBeenCalledTimes(1);
    expectStillActive();
  });
});
