// jest.mockのfactoryから参照するため、対象モジュールより先にimportしておく必要がある
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as fc from "fast-check";
import {
  addFavoriteVideo,
  addRecentVideo,
  deletePracticePhrase,
  deletePracticeSession,
  recordPhraseResult,
  removeFavoriteVideo,
  savePhraseAttempt,
  savePracticePhrase,
  savePracticeSession,
  updateReminderSettings,
} from "../storage";
import type { PracticePhrase } from "@/shared/types/models";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

const VIDEO_IDS = ["aaaaaaaaaa1", "bbbbbbbbbb2", "cccccccccc3"] as const;
const SESSION_IDS = ["s0", "s1", "s2"] as const;
const PHRASE_IDS = ["p0", "p1", "p2"] as const;
const ATTEMPT_IDS = ["a0", "a1", "a2"] as const;

function makePhrase(id: string): PracticePhrase {
  return {
    id,
    videoId: VIDEO_IDS[0],
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

/** 保存操作1件。反例の表示にはlabelを使う */
type Command = { label: string; run: () => Promise<unknown> };

function command(label: string, run: () => Promise<unknown>): Command {
  return { label, run, [fc.toStringMethod]: () => label } as Command;
}

/** 保存操作の組み立て。性質テストの生成と固定の反例の両方で使う */
const op = {
  saveSession: (id: string, d: number) =>
    command(`savePracticeSession(${id},${d})`, () =>
      savePracticeSession({ id, date: `2026-09-0${d}T00:00:00.000Z`, duration: 600 }),
    ),
  deleteSession: (id: string) => command(`deletePracticeSession(${id})`, () => deletePracticeSession(id)),
  addFavorite: (i: number) =>
    command(`addFavoriteVideo(${i})`, () =>
      addFavoriteVideo({
        id: `f${i}`,
        videoId: VIDEO_IDS[i],
        title: `お気に入り${i}`,
        addedAt: "2026-09-01T00:00:00.000Z",
      }),
    ),
  removeFavorite: (i: number) =>
    command(`removeFavoriteVideo(${i})`, () => removeFavoriteVideo(VIDEO_IDS[i])),
  addRecent: (i: number, d: number) =>
    command(`addRecentVideo(${i},${d})`, () =>
      addRecentVideo({ videoId: VIDEO_IDS[i], title: `動画${i}`, lastWatchedAt: `2026-09-0${d}T00:00:00.000Z` }),
    ),
  savePhrase: (id: string) => command(`savePracticePhrase(${id})`, () => savePracticePhrase(makePhrase(id))),
  deletePhrase: (id: string) => command(`deletePracticePhrase(${id})`, () => deletePracticePhrase(id)),
  recordResult: (id: string, phraseId: string, result: "ok" | "ng", bpm: number) =>
    command(`recordPhraseResult(${id},${phraseId},${result},${bpm})`, () =>
      recordPhraseResult({ id, phraseId, date: "2026-09-02T00:00:00.000Z", bpm, result }),
    ),
  saveAttempt: (id: string, phraseId: string) =>
    command(`savePhraseAttempt(${id},${phraseId})`, () =>
      savePhraseAttempt({ id, phraseId, date: "2026-09-02T00:00:00.000Z", bpm: 80, result: "ng" }),
    ),
  updateReminder: (enabled: boolean) =>
    command(`updateReminderSettings(${enabled})`, () => updateReminderSettings({ enabled })),
};

const videoIndex = fc.integer({ min: 0, max: VIDEO_IDS.length - 1 });
const day = fc.integer({ min: 1, max: 9 });
const sessionId = fc.constantFrom(...SESSION_IDS);
const phraseId = fc.constantFrom(...PHRASE_IDS);
const attemptId = fc.constantFrom(...ATTEMPT_IDS);

const commandArb: fc.Arbitrary<Command> = fc.oneof(
  fc.tuple(sessionId, day).map(([id, d]) => op.saveSession(id, d)),
  sessionId.map(op.deleteSession),
  videoIndex.map(op.addFavorite),
  videoIndex.map(op.removeFavorite),
  fc.tuple(videoIndex, day).map(([i, d]) => op.addRecent(i, d)),
  phraseId.map(op.savePhrase),
  phraseId.map(op.deletePhrase),
  fc
    .tuple(attemptId, phraseId, fc.constantFrom("ok" as const, "ng" as const), fc.integer({ min: 60, max: 140 }))
    .map(([id, pid, result, bpm]) => op.recordResult(id, pid, result, bpm)),
  fc.tuple(attemptId, phraseId).map(([id, pid]) => op.saveAttempt(id, pid)),
  fc.boolean().map(op.updateReminder),
);

/** 他のデータがある状態から始めるため、各キーに1件以上入れておく */
async function seed(): Promise<void> {
  await AsyncStorage.clear();
  await savePracticeSession({ id: "s0", date: "2026-09-01T00:00:00.000Z", duration: 300 });
  await addFavoriteVideo({
    id: "f0",
    videoId: VIDEO_IDS[0],
    title: "お気に入り0",
    addedAt: "2026-09-01T00:00:00.000Z",
  });
  await addRecentVideo({ videoId: VIDEO_IDS[0], title: "動画0", lastWatchedAt: "2026-09-01T00:00:00.000Z" });
  await savePracticePhrase(makePhrase("p0"));
  await savePracticePhrase(makePhrase("p1"));
  await savePhraseAttempt({ id: "a0", phraseId: "p0", date: "2026-09-01T00:00:00.000Z", bpm: 80, result: "ok" });
}

/** ストレージの全キーの値と、各操作の成否を比較できる形で取り出す */
async function snapshot(outcomes: PromiseSettledResult<unknown>[]) {
  const keys = [...(await AsyncStorage.getAllKeys())].sort();
  return {
    storage: Object.fromEntries(await AsyncStorage.multiGet(keys)),
    outcomes: outcomes.map((o) => (o.status === "fulfilled" ? "fulfilled" : `rejected:${String(o.reason)}`)),
  };
}

async function runOneByOne(commands: Command[]) {
  await seed();
  const outcomes: PromiseSettledResult<unknown>[] = [];
  for (const c of commands) {
    outcomes.push(...(await Promise.allSettled([c.run()])));
  }
  return snapshot(outcomes);
}

async function runAllAtOnce(commands: Command[]) {
  await seed();
  return snapshot(await Promise.allSettled(commands.map((c) => c.run())));
}

/** 6つの保存操作それぞれについて、直列化が外れると必ず結果が食い違う組み合わせ */
const LOST_UPDATE_EXAMPLES: Command[][] = [
  [op.saveSession("s1", 2), op.saveSession("s2", 3)],
  [op.saveSession("s1", 2), op.deleteSession("s0")],
  [op.addFavorite(1), op.addFavorite(2)],
  [op.addFavorite(1), op.removeFavorite(0)],
  [op.addRecent(1, 2), op.addRecent(2, 3)],
  [op.savePhrase("p2"), op.deletePhrase("p0")],
  [op.deletePhrase("p0"), op.deletePhrase("p1")],
];

describe("保存操作の直列化", () => {
  it("同時に投げた保存操作の結果は、1件ずつ順に実行した結果と一致する", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(commandArb, { minLength: 2, maxLength: 8 }), async (commands) => {
        const expected = await runOneByOne(commands);
        const actual = await runAllAtOnce(commands);
        expect(actual).toEqual(expected);
      }),
      { numRuns: 100, examples: LOST_UPDATE_EXAMPLES.map((commands) => [commands]) },
    );
  });
});
