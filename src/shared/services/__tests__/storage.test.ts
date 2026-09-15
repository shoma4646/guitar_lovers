// jest.mockのfactoryから参照するため、対象モジュールより先にimportしておく必要がある
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  STORAGE_KEYS,
  archivePracticePhrase,
  deletePracticePhrase,
  getPhraseAttempts,
  getPracticePhrases,
  migrateIfNeeded,
  recordPhraseResult,
  savePhraseAttempt,
  savePracticePhrase,
} from "../storage";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import {
  computeTodayTargetBpm,
  getLatestAttempt,
  resolveCurrentBpm,
} from "@/features/practice/lib/progression";

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

function makeAttempt(id: string, phraseId: string): PhraseAttempt {
  return {
    id,
    phraseId,
    date: "2026-09-02T00:00:00.000Z",
    bpm: 85,
    result: "ok",
  };
}

/** 指定キーへの次のsetItemを1回だけ失敗させる。戻り値で元の実装に戻す */
function failSetItemOnce(targetKey: string): () => void {
  // モックのsetItemは元からjest.fnなので、spyOnではなく実装を退避して差し替える
  const setItem = AsyncStorage.setItem as jest.Mock;
  const original = setItem.getMockImplementation()!;
  let armed = true;
  setItem.mockImplementation(async (key: string, value: string) => {
    if (armed && key === targetKey) {
      armed = false;
      throw new Error("disk full");
    }
    return original(key, value);
  });
  return () => setItem.mockImplementation(original);
}

async function corruptKeys(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((k) => k.includes("__corrupt_"));
}

describe("readList（要素単位の検証）", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("1件だけ壊れた要素があっても残りは返す", async () => {
    const broken = { id: "broken", name: "startSecが無い" };
    await AsyncStorage.setItem(
      STORAGE_KEYS.PRACTICE_PHRASES,
      JSON.stringify([makePhrase("a"), broken, makePhrase("b")]),
    );

    const phrases = await getPracticePhrases();

    expect(phrases.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("壊れた要素を捨てた後に保存しても正常な要素は失われず、捨てた要素は退避される", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.PRACTICE_PHRASES,
      JSON.stringify([makePhrase("a"), { id: "broken" }]),
    );

    await savePracticePhrase(makePhrase("c"));

    const phrases = await getPracticePhrases();
    expect(phrases.map((p) => p.id)).toEqual(["c", "a"]);
    const keys = await AsyncStorage.getAllKeys();
    const droppedKey = keys.find((k) => k.includes("__dropped_"));
    expect(droppedKey).toBeDefined();
    expect(JSON.parse((await AsyncStorage.getItem(droppedKey!)) ?? "[]")).toEqual([
      { id: "broken" },
    ]);
  });

  it("JSONが破損していれば退避キーへ保存して空配列を返す", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.PRACTICE_PHRASES, "{not json");

    const phrases = await getPracticePhrases();

    expect(phrases).toEqual([]);
    const backups = await corruptKeys();
    expect(backups).toHaveLength(1);
    expect(backups[0]).toContain(STORAGE_KEYS.PRACTICE_PHRASES);
    expect(await AsyncStorage.getItem(backups[0])).toBe("{not json");
  });

  it("破損データの退避は1回で完結し、繰り返し読んでも退避キーは増えない", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.PRACTICE_PHRASES, "{not json");
    await AsyncStorage.setItem(
      STORAGE_KEYS.PHRASE_ATTEMPTS,
      JSON.stringify([makeAttempt("a1", "p"), { id: "broken" }]),
    );

    await getPracticePhrases();
    await getPracticePhrases();
    await getPhraseAttempts();
    await getPhraseAttempts();

    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((k) => k.includes("__corrupt_"))).toHaveLength(1);
    expect(keys.filter((k) => k.includes("__dropped_"))).toHaveLength(1);
    expect((await getPhraseAttempts()).map((a) => a.id)).toEqual(["a1"]);
  });

  it("同一キーへの並行書き込みが互いの変更を消さない", async () => {
    await savePracticePhrase(makePhrase("p"));

    await Promise.all([
      recordPhraseResult({ ...makeAttempt("a1", "p"), bpm: 120, result: "ok" }),
      archivePracticePhrase("p"),
    ]);

    const [phrase] = await getPracticePhrases();
    expect(phrase.currentBpm).toBe(120);
    expect(phrase.archivedAt).toEqual(expect.any(String));
  });

  it("配列でない内容も退避キーへ保存して空配列を返す", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.PHRASE_ATTEMPTS,
      JSON.stringify({ oops: true }),
    );

    const attempts = await getPhraseAttempts();

    expect(attempts).toEqual([]);
    expect(await corruptKeys()).toHaveLength(1);
  });

  it("キーが未設定なら空配列を返す", async () => {
    expect(await getPracticePhrases()).toEqual([]);
  });
});

describe("フレーズの削除とアーカイブ", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("フレーズ削除で関連する練習結果も削除される", async () => {
    await savePracticePhrase(makePhrase("keep"));
    await savePracticePhrase(makePhrase("gone"));
    await savePhraseAttempt(makeAttempt("a1", "gone"));
    await savePhraseAttempt(makeAttempt("a2", "keep"));

    await deletePracticePhrase("gone");

    expect((await getPracticePhrases()).map((p) => p.id)).toEqual(["keep"]);
    expect((await getPhraseAttempts()).map((a) => a.id)).toEqual(["a2"]);
  });

  it("archivePracticePhraseでarchivedAtが設定される", async () => {
    await savePracticePhrase(makePhrase("x"));

    await archivePracticePhrase("x");

    const [phrase] = await getPracticePhrases();
    expect(phrase.archivedAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(phrase.archivedAt!))).toBe(false);
  });
});

describe("recordPhraseResult", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("弾けた結果は到達BPMを引き上げる", async () => {
    await savePracticePhrase(makePhrase("p"));

    await recordPhraseResult({ ...makeAttempt("a1", "p"), bpm: 90, result: "ok" });

    const [phrase] = await getPracticePhrases();
    expect(phrase.currentBpm).toBe(90);
    expect(await getPhraseAttempts()).toHaveLength(1);
  });

  it("同じattempt IDで再実行しても結果は重複しない", async () => {
    await savePracticePhrase(makePhrase("p"));
    const attempt = { ...makeAttempt("a1", "p"), bpm: 90, result: "ok" as const };

    await recordPhraseResult(attempt);
    await recordPhraseResult(attempt);

    expect(await getPhraseAttempts()).toHaveLength(1);
    expect((await getPracticePhrases())[0].currentBpm).toBe(90);
  });

  it("到達BPMより低いBPMで弾けても到達BPMは後退しない", async () => {
    await savePracticePhrase(makePhrase("p"));

    await recordPhraseResult({ ...makeAttempt("a1", "p"), bpm: 70, result: "ok" });

    expect((await getPracticePhrases())[0].currentBpm).toBe(80);
  });

  it("結果保存後に到達BPM更新が失敗しても、同じ入力の再実行で完了まで前進する", async () => {
    await savePracticePhrase(makePhrase("p"));
    const attempt = { ...makeAttempt("a1", "p"), bpm: 120, result: "ok" as const };
    const restore = failSetItemOnce(STORAGE_KEYS.PRACTICE_PHRASES);

    try {
      await expect(recordPhraseResult(attempt)).rejects.toThrow("disk full");
      expect((await getPracticePhrases())[0].currentBpm).toBe(80);
      expect((await getPhraseAttempts()).map((a) => a.id)).toEqual(["a1"]);
      // 途中状態でも読み出し側は記録から到達BPMを補える
      expect(resolveCurrentBpm(80, await getPhraseAttempts())).toBe(120);

      await recordPhraseResult(attempt);

      expect((await getPracticePhrases())[0].currentBpm).toBe(120);
      expect((await getPhraseAttempts()).map((a) => a.id)).toEqual(["a1"]);
    } finally {
      restore();
    }
  });

  it("途中失敗後に入力を変えて再送しても、記録と到達BPMが矛盾しない", async () => {
    await savePracticePhrase(makePhrase("p"));
    const restore = failSetItemOnce(STORAGE_KEYS.PRACTICE_PHRASES);

    try {
      await expect(
        recordPhraseResult({ ...makeAttempt("a1", "p"), bpm: 120, result: "ok" }),
      ).rejects.toThrow("disk full");
      await recordPhraseResult({ ...makeAttempt("a1", "p"), bpm: 120, result: "ng" });

      const attempts = await getPhraseAttempts();
      expect(attempts).toHaveLength(1);
      expect(attempts[0].result).toBe("ng");
      expect((await getPracticePhrases())[0].currentBpm).toBe(80);
      expect(resolveCurrentBpm(80, attempts)).toBe(80);
    } finally {
      restore();
    }
  });

  it("削除済みフレーズへの記録は例外にし、孤児の結果を残さない", async () => {
    await expect(
      recordPhraseResult({ ...makeAttempt("a1", "missing"), bpm: 90, result: "ok" }),
    ).rejects.toThrow();

    expect(await getPhraseAttempts()).toHaveLength(0);
  });

  it("記録と翌日の目標BPM算出が端から端まで繋がる", async () => {
    await savePracticePhrase({ ...makePhrase("p"), currentBpm: 80, targetBpm: 90 });

    await recordPhraseResult({ ...makeAttempt("a1", "p"), date: "2026-09-01T00:00:00.000Z", bpm: 80, result: "ok" });
    let [phrase] = await getPracticePhrases();
    let latest = getLatestAttempt((await getPhraseAttempts()).filter((a) => a.phraseId === "p"));
    expect(computeTodayTargetBpm(phrase.currentBpm, latest, phrase.targetBpm)).toBe(85);

    await recordPhraseResult({ ...makeAttempt("a2", "p"), date: "2026-09-02T00:00:00.000Z", bpm: 85, result: "ok" });
    [phrase] = await getPracticePhrases();
    latest = getLatestAttempt((await getPhraseAttempts()).filter((a) => a.phraseId === "p"));
    expect(phrase.currentBpm).toBe(85);
    expect(computeTodayTargetBpm(phrase.currentBpm, latest, phrase.targetBpm)).toBe(90);

    await recordPhraseResult({ ...makeAttempt("a3", "p"), date: "2026-09-03T00:00:00.000Z", bpm: 90, result: "ok" });
    [phrase] = await getPracticePhrases();
    latest = getLatestAttempt((await getPhraseAttempts()).filter((a) => a.phraseId === "p"));
    expect(computeTodayTargetBpm(phrase.currentBpm, latest, phrase.targetBpm)).toBe(90);
  });

  it("弾いた回数付きの記録は回数を保ったまま読み出せ、回数なしの既存記録も退避されない", async () => {
    await savePracticePhrase(makePhrase("p"));
    await AsyncStorage.setItem(
      STORAGE_KEYS.PHRASE_ATTEMPTS,
      JSON.stringify([makeAttempt("legacy", "p")]),
    );

    await recordPhraseResult({ ...makeAttempt("a1", "p"), bpm: 90, result: "ok", reps: 3 });

    const attempts = await getPhraseAttempts();
    expect(attempts.map((a) => [a.id, a.reps])).toEqual([
      ["a1", 3],
      ["legacy", undefined],
    ]);
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((k) => k.includes("__dropped_") || k.includes("__corrupt_"))).toEqual([]);
  });

  it("あやしい・弾けなかった結果では到達BPMを変えない", async () => {
    await savePracticePhrase(makePhrase("p"));

    await recordPhraseResult({ ...makeAttempt("a1", "p"), bpm: 120, result: "ng" });

    expect((await getPracticePhrases())[0].currentBpm).toBe(80);
    expect(await getPhraseAttempts()).toHaveLength(1);
  });
});

describe("migrateIfNeeded", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("未設定ならschema_versionに現行バージョンを書く", async () => {
    await migrateIfNeeded();

    expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe("2");
  });

  it("旧ビルドが検証せずに保存した値を新スキーマに収まる形へ補正し、データを失わない", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.PRACTICE_PHRASES,
      JSON.stringify([
        { ...makePhrase("fast"), currentBpm: 300, targetBpm: 320.7 },
        { ...makePhrase("slow"), currentBpm: 30 },
        { ...makePhrase("flat"), startSec: 20, endSec: 20 },
        { ...makePhrase("rev"), startSec: 30, endSec: 20 },
        {
          ...makePhrase("odd"),
          playbackRate: 0.8,
          createdAt: "2026-09-01T09:00:00+09:00",
          updatedAt: "2026-09-01",
        },
      ]),
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.PHRASE_ATTEMPTS,
      JSON.stringify([{ ...makeAttempt("a1", "slow"), bpm: 35, date: "2026-09-02" }]),
    );

    await migrateIfNeeded();

    const phrases = await getPracticePhrases();
    expect(phrases.map((p) => p.id)).toEqual(["fast", "slow", "flat", "rev", "odd"]);
    expect(phrases[0]).toMatchObject({ currentBpm: 240, targetBpm: 240 });
    expect(phrases[1].currentBpm).toBe(40);
    expect(phrases[2]).toMatchObject({ startSec: 20, endSec: 21 });
    expect(phrases[3]).toMatchObject({ startSec: 30, endSec: 31 });
    expect(phrases[4]).toMatchObject({
      playbackRate: 0.75,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
    const [attempt] = await getPhraseAttempts();
    expect(attempt.bpm).toBe(40);
    expect(attempt.date).toBe("2026-09-02T00:00:00.000Z");
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((k) => k.includes("__corrupt_") || k.includes("__dropped_"))).toHaveLength(0);
  });

  it("移行をawaitせずに直後に読み出しても、移行後の値が返る", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.PRACTICE_PHRASES,
      JSON.stringify([{ ...makePhrase("x"), currentBpm: 300 }]),
    );

    void migrateIfNeeded();
    const phrases = await getPracticePhrases();

    expect(phrases).toHaveLength(1);
    expect(phrases[0].currentBpm).toBe(240);
    expect(await corruptKeys()).toHaveLength(0);
  });

  it("移行の書き込みが失敗した読み出しは失敗し、旧データを退避・除去しない", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.PRACTICE_PHRASES,
      JSON.stringify([{ ...makePhrase("x"), currentBpm: 300 }]),
    );
    const restore = failSetItemOnce(STORAGE_KEYS.PRACTICE_PHRASES);

    try {
      await expect(getPracticePhrases()).rejects.toThrow("disk full");
      const keys = await AsyncStorage.getAllKeys();
      expect(keys.filter((k) => k.includes("__dropped_") || k.includes("__corrupt_"))).toHaveLength(0);
      expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBeNull();
    } finally {
      restore();
    }

    // 次の読み出しで移行を再試行し、旧データが補正されて返る
    const phrases = await getPracticePhrases();
    expect(phrases[0].currentBpm).toBe(240);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe("2");
  });

  it("起動時の移行が失敗しても例外を外へ出さず、次の読み出しで再試行する", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.PRACTICE_PHRASES,
      JSON.stringify([{ ...makePhrase("x"), currentBpm: 300 }]),
    );
    const restore = failSetItemOnce(STORAGE_KEYS.PRACTICE_PHRASES);
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(migrateIfNeeded()).resolves.toBeUndefined();
      expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBeNull();
    } finally {
      restore();
      consoleError.mockRestore();
    }

    expect((await getPracticePhrases())[0].currentBpm).toBe(240);
  });

  it("バージョン1からも補正を適用する", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, "1");
    await AsyncStorage.setItem(
      STORAGE_KEYS.PRACTICE_PHRASES,
      JSON.stringify([{ ...makePhrase("x"), currentBpm: 999 }]),
    );

    await migrateIfNeeded();

    expect((await getPracticePhrases())[0].currentBpm).toBe(240);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe("2");
  });

  it("既に現行バージョンなら何もしない", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, "2");
    const setItem = jest.spyOn(AsyncStorage, "setItem");
    setItem.mockClear();

    await migrateIfNeeded();

    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});
