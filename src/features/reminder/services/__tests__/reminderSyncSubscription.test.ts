import { createElement, type ReactNode } from "react";
import { QueryClientProvider, type QueryClient, type UseMutationResult } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";
import { useSavePracticePhrase } from "@/features/practice/api/useSavePracticePhrase";
import { useUpdatePracticePhrase } from "@/features/practice/api/useUpdatePracticePhrase";
import { useGraduatePracticePhrase } from "@/features/practice/api/useGraduatePracticePhrase";
import { useArchivePracticePhrase } from "@/features/practice/api/useArchivePracticePhrase";
import { useDeletePracticePhrase } from "@/features/practice/api/useDeletePracticePhrase";
import { useRecordPhraseResult } from "@/features/practice/api/useRecordPhraseResult";
import { useSavePhraseAttempt } from "@/features/practice/api/useSavePhraseAttempt";
import { useToggleFavoriteVideo } from "@/features/practice/api/useToggleFavoriteVideo";
import { useAddRecentVideo } from "@/features/practice/api/useAddRecentVideo";
import { useSavePracticeSession } from "@/features/progress/api/useSavePracticeSession";
import { useDeletePracticeSession } from "@/features/progress/api/useDeletePracticeSession";
import { useUpdateReminderSettings } from "@/features/reminder/api/useUpdateReminderSettings";
import { subscribeReminderSync } from "../reminderSyncSubscription";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@/shared/services/storage", () => {
  const resolved = () => jest.fn().mockResolvedValue(undefined);
  return {
    ...jest.requireActual("@/shared/services/storage"),
    savePracticePhrase: resolved(),
    updatePracticePhrase: resolved(),
    archivePracticePhrase: resolved(),
    deletePracticePhrase: resolved(),
    recordPhraseResult: resolved(),
    savePhraseAttempt: resolved(),
    addFavoriteVideo: resolved(),
    removeFavoriteVideo: resolved(),
    addRecentVideo: resolved(),
    savePracticeSession: resolved(),
    deletePracticeSession: resolved(),
    updateReminderSettings: jest.fn().mockResolvedValue({
      enabled: true,
      timeOverride: null,
      permissionPromptedAt: null,
    }),
  };
});
jest.mock("@/features/reminder/services/reminderScheduler", () => ({
  syncReminder: jest.fn().mockResolvedValue(undefined),
}));

function runMutation(queryClient: QueryClient, mutationFn: () => Promise<unknown>) {
  return queryClient
    .getMutationCache()
    .build(queryClient, { mutationFn })
    .execute(undefined)
    .catch(() => undefined);
}

describe("subscribeReminderSync", () => {
  let queryClient: QueryClient;
  let sync: jest.Mock;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    sync = jest.fn();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("mutationが成功するたびに1回だけ呼ぶ", async () => {
    subscribeReminderSync(queryClient, sync);

    await runMutation(queryClient, async () => "saved");
    await runMutation(queryClient, async () => "saved again");

    expect(sync).toHaveBeenCalledTimes(2);
  });

  it("mutationが失敗したときは呼ばない", async () => {
    subscribeReminderSync(queryClient, sync);

    await runMutation(queryClient, async () => {
      throw new Error("保存失敗");
    });

    expect(sync).not.toHaveBeenCalled();
  });

  it("解除後は呼ばない", async () => {
    const unsubscribe = subscribeReminderSync(queryClient, sync);
    unsubscribe();

    await runMutation(queryClient, async () => "saved");

    expect(sync).not.toHaveBeenCalled();
  });
});

const PHRASE = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "テスト動画",
  name: "イントロのリフ",
  startSec: 10,
  endSec: 20,
  currentBpm: 90,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};
const ATTEMPT = { id: "a1", phraseId: "p1", date: "2026-09-02T00:00:00.000Z", bpm: 95, result: "ok" as const };
const VIDEO = { id: "v1", videoId: "abc123def45", title: "テスト動画", addedAt: "2026-09-02T00:00:00.000Z" };

type AnyMutation = () => UseMutationResult<any, any, any, any>;

const AFFECTS_REMINDER: [string, AnyMutation, unknown][] = [
  ["フレーズ保存", useSavePracticePhrase, PHRASE],
  ["フレーズ更新", useUpdatePracticePhrase, { id: "p1", patch: { name: "サビ" } }],
  ["フレーズ卒業", useGraduatePracticePhrase, { id: "p1", graduatedAt: "2026-09-02T00:00:00.000Z" }],
  ["フレーズのアーカイブ", useArchivePracticePhrase, "p1"],
  ["フレーズ削除", useDeletePracticePhrase, "p1"],
  ["結果記録", useRecordPhraseResult, ATTEMPT],
  ["結果保存", useSavePhraseAttempt, ATTEMPT],
  ["セッション保存", useSavePracticeSession, { id: "s1", date: "2026-09-02T00:00:00.000Z", duration: 60 }],
  ["セッション削除", useDeletePracticeSession, "s1"],
  ["リマインド設定の変更", useUpdateReminderSettings, { enabled: true }],
];

const UNRELATED_TO_REMINDER: [string, AnyMutation, unknown][] = [
  ["お気に入りの追加", useToggleFavoriteVideo, { type: "add", video: VIDEO }],
  ["お気に入りの解除", useToggleFavoriteVideo, { type: "remove", videoId: "abc123def45" }],
  ["最近見た動画の追加", useAddRecentVideo, { videoId: "abc123def45", title: "テスト動画", lastWatchedAt: "2026-09-02T00:00:00.000Z" }],
];

async function runHookMutation(useMutationHook: AnyMutation, variables: unknown) {
  const queryClient = createTestQueryClient();
  const sync = jest.fn();
  subscribeReminderSync(queryClient, sync);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  const { result } = renderHook(() => useMutationHook(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync(variables);
  });
  queryClient.clear();
  return sync;
}

describe("subscribeReminderSync と実際の書き込み操作", () => {
  it.each(AFFECTS_REMINDER)("%sが成功したら予約を作り直す", async (_label, useMutationHook, variables) => {
    const sync = await runHookMutation(useMutationHook, variables);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it.each(UNRELATED_TO_REMINDER)("%sが成功しても予約を作り直さない", async (_label, useMutationHook, variables) => {
    const sync = await runHookMutation(useMutationHook, variables);
    expect(sync).not.toHaveBeenCalled();
  });
});
