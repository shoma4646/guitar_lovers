import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { createAppQueryClient } from "@/shared/lib/createAppQueryClient";
import {
  savePhraseAttempt,
  savePracticePhrase,
  savePracticeSession,
} from "@/shared/services/storage";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { useRecordPhraseResult } from "@/features/practice/api/useRecordPhraseResult";
import { useArchivePracticePhrase } from "@/features/practice/api/useArchivePracticePhrase";
import { useGraduatePracticePhrase } from "@/features/practice/api/useGraduatePracticePhrase";
import { useDeletePracticePhrase } from "@/features/practice/api/useDeletePracticePhrase";
import { useUpdatePracticePhrase } from "@/features/practice/api/useUpdatePracticePhrase";
import { usePracticeSessions } from "@/features/progress/api/usePracticeSessions";
import { useSavePracticeSession } from "@/features/progress/api/useSavePracticeSession";
import { useDeletePracticeSession } from "@/features/progress/api/useDeletePracticeSession";
import type { PracticePhrase, PracticeSession } from "@/shared/types/models";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

function makePhrase(id: string): PracticePhrase {
  return {
    id,
    videoId: "abc123def45",
    videoTitle: "テスト動画",
    name: `フレーズ${id}`,
    startSec: 10,
    endSec: 20,
    currentBpm: 80,
    targetBpm: 120,
    playbackRate: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

function makeSession(id: string): PracticeSession {
  return { id, date: "2026-09-01T00:00:00.000Z", duration: 600 };
}

function useScreenData() {
  return {
    sessions: usePracticeSessions(),
    phrases: usePracticePhrases(),
    attempts: usePhraseAttempts(),
    recordResult: useRecordPhraseResult(),
    saveSession: useSavePracticeSession(),
    deleteSession: useDeletePracticeSession(),
    archivePhrase: useArchivePracticePhrase(),
    graduatePhrase: useGraduatePracticePhrase(),
    deletePhrase: useDeletePracticePhrase(),
    updatePhrase: useUpdatePracticePhrase(),
  };
}

type ScreenData = ReturnType<typeof useScreenData>;

const sessionIds = (h: ScreenData) => h.sessions.data?.map((s) => s.id);
const phraseIds = (h: ScreenData) => h.phrases.data?.map((p) => p.id);
const attemptIds = (h: ScreenData) => h.attempts.data?.map((a) => a.id);
const phrase1 = (h: ScreenData) => h.phrases.data?.find((p) => p.id === "p1");

const GRADUATED_AT = "2026-09-10T00:00:00.000Z";

type WriteCase = {
  name: string;
  write: (h: ScreenData) => Promise<unknown>;
  read: (h: ScreenData) => unknown;
  before: unknown;
  after: unknown;
};

const WRITE_CASES: WriteCase[] = [
  {
    name: "結果の記録: 結果の一覧に追加され、フレーズの到達BPMが上がる",
    write: (h) =>
      h.recordResult.mutateAsync({
        id: "a3",
        phraseId: "p1",
        date: "2026-09-03T00:00:00.000Z",
        bpm: 100,
        result: "ok",
      }),
    read: (h) => ({ attempts: attemptIds(h), currentBpm: phrase1(h)?.currentBpm }),
    before: { attempts: ["a2", "a1"], currentBpm: 80 },
    after: { attempts: ["a3", "a2", "a1"], currentBpm: 100 },
  },
  {
    name: "練習記録の保存: 一覧に追加される",
    write: (h) => h.saveSession.mutateAsync(makeSession("s3")),
    read: sessionIds,
    before: ["s2", "s1"],
    after: ["s3", "s2", "s1"],
  },
  {
    name: "練習記録の削除: 2件保存 → s1 を削除 → 一覧が s2 だけになる",
    write: (h) => h.deleteSession.mutateAsync("s1"),
    read: sessionIds,
    before: ["s2", "s1"],
    after: ["s2"],
  },
  {
    name: "アーカイブ: archivedAt が付く",
    write: (h) => h.archivePhrase.mutateAsync("p1"),
    read: (h) => phrase1(h)?.archivedAt !== undefined,
    before: false,
    after: true,
  },
  {
    name: "卒業: graduatedAt が付く",
    write: (h) => h.graduatePhrase.mutateAsync({ id: "p1", graduatedAt: GRADUATED_AT }),
    read: (h) => phrase1(h)?.graduatedAt,
    before: undefined,
    after: GRADUATED_AT,
  },
  {
    name: "フレーズ削除: フレーズの一覧とそのフレーズの結果から消える",
    write: (h) => h.deletePhrase.mutateAsync("p1"),
    read: (h) => ({ phrases: phraseIds(h), attempts: attemptIds(h) }),
    before: { phrases: ["p2", "p1"], attempts: ["a2", "a1"] },
    after: { phrases: ["p2"], attempts: ["a2"] },
  },
  {
    name: "フレーズ更新: 変更した名前になる",
    write: (h) => h.updatePhrase.mutateAsync({ id: "p1", patch: { name: "新しい名前" } }),
    read: (h) => phrase1(h)?.name,
    before: "フレーズp1",
    after: "新しい名前",
  },
];

describe("書き込み後に、アプリと同じQueryClientの上で同じ画面の読み出しが新しい値になる", () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    await AsyncStorage.clear();
    await savePracticePhrase(makePhrase("p1"));
    await savePracticePhrase(makePhrase("p2"));
    await savePhraseAttempt({
      id: "a1",
      phraseId: "p1",
      date: "2026-09-01T00:00:00.000Z",
      bpm: 80,
      result: "partial",
    });
    await savePhraseAttempt({
      id: "a2",
      phraseId: "p2",
      date: "2026-09-02T00:00:00.000Z",
      bpm: 80,
      result: "ok",
    });
    await savePracticeSession(makeSession("s1"));
    await savePracticeSession(makeSession("s2"));

    queryClient = createAppQueryClient();
    // gcタイマーが残るとjestが終了しないため、本番の既定値（staleTime）だけを引き継いでgcを止める
    const defaults = queryClient.getDefaultOptions();
    queryClient.setDefaultOptions({
      queries: { ...defaults.queries, gcTime: Infinity },
      mutations: { ...defaults.mutations, gcTime: Infinity },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it.each(WRITE_CASES)("$name", async ({ write, read, before, after }) => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(useScreenData, { wrapper });
    await waitFor(() => {
      expect(result.current.sessions.isSuccess).toBe(true);
      expect(result.current.phrases.isSuccess).toBe(true);
      expect(result.current.attempts.isSuccess).toBe(true);
    });
    expect(read(result.current)).toEqual(before);

    await act(async () => {
      await write(result.current);
    });

    await waitFor(() => expect(read(result.current)).toEqual(after));
  });
});
