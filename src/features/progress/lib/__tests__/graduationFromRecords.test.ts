import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  STORAGE_KEYS,
  getPhraseAttempts,
  getPracticePhrases,
  recordPhraseResult,
  savePracticePhrase,
} from "@/shared/services/storage";
import { splitPhraseProgress } from "../phraseProgress";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

const PHRASE: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "テスト動画",
  name: "イントロのリフ",
  startSec: 10,
  endSec: 20,
  currentBpm: 110,
  initialBpm: 90,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

function okAttempt(id: string, date: string, bpm: number): PhraseAttempt {
  return { id, phraseId: "p1", date, bpm, result: "ok" };
}

function phraseWrites(): number {
  return (AsyncStorage.setItem as jest.Mock).mock.calls.filter(
    ([key]) => key === STORAGE_KEYS.PRACTICE_PHRASES,
  ).length;
}

async function loadGraduated() {
  const [phrases, attempts] = await Promise.all([getPracticePhrases(), getPhraseAttempts()]);
  return splitPhraseProgress(phrases, attempts).graduated;
}

describe("記録から求める卒業日", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("目標ちょうどで弾けた記録を1件つけると、フレーズへの書き込みは1回だけで、卒業一覧にその記録の日付で出る", async () => {
    await savePracticePhrase(PHRASE);
    (AsyncStorage.setItem as jest.Mock).mockClear();

    await recordPhraseResult(okAttempt("a1", "2026-09-10T12:00:00.000Z", 120));

    expect(phraseWrites()).toBe(1);
    const graduated = await loadGraduated();
    expect(graduated.map((s) => [s.phrase.id, s.graduatedAt])).toEqual([
      ["p1", "2026-09-10T12:00:00.000Z"],
    ]);
  });

  it("目標未満のBPM、または目標以上でもok以外の記録では卒業一覧に出ない", async () => {
    await savePracticePhrase(PHRASE);
    await recordPhraseResult(okAttempt("a1", "2026-09-10T12:00:00.000Z", 119));
    await recordPhraseResult({ ...okAttempt("a2", "2026-09-11T12:00:00.000Z", 120), result: "partial" });
    await recordPhraseResult({ ...okAttempt("a3", "2026-09-12T12:00:00.000Z", 125), result: "ng" });

    expect(await loadGraduated()).toEqual([]);
  });

  it("卒業済みのフレーズを後日もう一度記録しても、卒業日は最初に届いた日のまま", async () => {
    await savePracticePhrase(PHRASE);
    await recordPhraseResult(okAttempt("a1", "2026-09-10T12:00:00.000Z", 120));
    await recordPhraseResult(okAttempt("a2", "2026-09-15T12:00:00.000Z", 125));

    const graduated = await loadGraduated();
    expect(graduated[0]?.graduatedAt).toBe("2026-09-10T12:00:00.000Z");
  });

  it("卒業日が保存済みの既存データは、記録から求めた日付ではなく保存された日付で出る", async () => {
    await savePracticePhrase({ ...PHRASE, graduatedAt: "2026-09-05T00:00:00.000Z" });
    await recordPhraseResult(okAttempt("a1", "2026-09-10T12:00:00.000Z", 120));

    const graduated = await loadGraduated();
    expect(graduated[0]?.graduatedAt).toBe("2026-09-05T00:00:00.000Z");
  });
});
