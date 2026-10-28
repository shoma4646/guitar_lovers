// jest.mockのfactoryから参照するため、対象モジュールより先にimportしておく必要がある
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  STORAGE_KEYS,
  StorageReadError,
  StorageValidationError,
  addFavoriteVideo,
  addRecentVideo,
  archivePracticePhrase,
  deletePracticePhrase,
  deletePracticeSession,
  getFavoriteVideos,
  getPhraseAttempts,
  getPracticePhrases,
  getPracticeSessions,
  getRecentVideos,
  getReminderSettings,
  migrateIfNeeded,
  recordPhraseResult,
  removeFavoriteVideo,
  savePhraseAttempt,
  savePracticePhrase,
  savePracticeSession,
  updatePracticePhrase,
  updateReminderSettings,
} from "../storage";
import { DEFAULT_REMINDER_SETTINGS } from "@/shared/lib/schemas/reminderSettings";
import type {
  FavoriteVideo,
  PhraseAttempt,
  PracticePhrase,
  PracticeSession,
  RecentVideo,
} from "@/shared/types/models";
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

describe("初期BPMと卒業日時の永続化", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("initialBpmとgraduatedAtは保存して読み出しても保持される", async () => {
    await savePracticePhrase({ ...makePhrase("x"), initialBpm: 80 });
    await updatePracticePhrase("x", { graduatedAt: "2026-09-03T00:00:00.000Z" });

    const [phrase] = await getPracticePhrases();
    expect(phrase.initialBpm).toBe(80);
    expect(phrase.graduatedAt).toBe("2026-09-03T00:00:00.000Z");
  });

  it("graduatedAtにundefinedを渡すと保存データからキーが消える", async () => {
    await savePracticePhrase({ ...makePhrase("x"), graduatedAt: "2026-09-03T00:00:00.000Z" });

    await updatePracticePhrase("x", { targetBpm: 140, graduatedAt: undefined });

    const [phrase] = await getPracticePhrases();
    expect(phrase.targetBpm).toBe(140);
    expect("graduatedAt" in phrase).toBe(false);
    const raw = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.PRACTICE_PHRASES))!);
    expect("graduatedAt" in raw[0]).toBe(false);
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

  it("途中失敗後にreps付きで再送すると、reps込みの記録が1件だけ残る", async () => {
    await savePracticePhrase(makePhrase("p"));
    const restore = failSetItemOnce(STORAGE_KEYS.PRACTICE_PHRASES);

    try {
      await expect(
        recordPhraseResult({ ...makeAttempt("a1", "p"), bpm: 90, result: "ok", reps: 3 }),
      ).rejects.toThrow("disk full");

      await recordPhraseResult({ ...makeAttempt("a1", "p"), bpm: 90, result: "ok", reps: 4 });

      const attempts = await getPhraseAttempts();
      expect(attempts).toHaveLength(1);
      expect(attempts[0].reps).toBe(4);
      expect((await getPracticePhrases())[0].currentBpm).toBe(90);
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

    expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe("4");
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
    expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe("4");
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
    expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe("4");
  });

  it("練習セッションの日付だけの日時をISO 8601へ移行し、退避しない", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, "2");
    await AsyncStorage.setItem(
      STORAGE_KEYS.PRACTICE_SESSIONS,
      JSON.stringify([
        { id: "s1", date: "2026-04-27", duration: 600 },
        { id: "s2", date: "2026-04-28T09:00:00+09:00", duration: 300 },
        { id: "s3", date: "2026-04-29T00:00:00.000Z", duration: 120 },
      ]),
    );

    await migrateIfNeeded();

    const sessions = await getPracticeSessions();
    expect(sessions.map((s) => s.date)).toEqual([
      "2026-04-27T00:00:00.000Z",
      "2026-04-28T00:00:00.000Z",
      "2026-04-29T00:00:00.000Z",
    ]);
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((k) => k.includes("__corrupt_") || k.includes("__dropped_"))).toHaveLength(0);
  });

  it("0秒の練習セッションを退避キーへ移して除き、他のセッションは残す", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, "3");
    const zero = { id: "zero", date: "2026-04-28T00:00:00.000Z", duration: 0 };
    await AsyncStorage.setItem(
      STORAGE_KEYS.PRACTICE_SESSIONS,
      JSON.stringify([
        { id: "s1", date: "2026-04-27T00:00:00.000Z", duration: 600 },
        zero,
        { id: "s3", date: "2026-04-29T00:00:00.000Z", duration: 120 },
      ]),
    );

    await migrateIfNeeded();

    expect((await getPracticeSessions()).map((s) => s.id)).toEqual(["s1", "s3"]);
    const keys = await AsyncStorage.getAllKeys();
    const droppedKeys = keys.filter((k) => k.startsWith(`${STORAGE_KEYS.PRACTICE_SESSIONS}__dropped_`));
    expect(droppedKeys).toHaveLength(1);
    expect(JSON.parse((await AsyncStorage.getItem(droppedKeys[0]))!)).toEqual([zero]);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe("4");
  });

  it("0秒の練習セッションが無ければ退避キーを作らない", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, "3");
    await AsyncStorage.setItem(
      STORAGE_KEYS.PRACTICE_SESSIONS,
      JSON.stringify([{ id: "s1", date: "2026-04-27T00:00:00.000Z", duration: 600 }]),
    );

    await migrateIfNeeded();

    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((k) => k.includes("__dropped_") || k.includes("__corrupt_"))).toHaveLength(0);
    expect((await getPracticeSessions()).map((s) => s.id)).toEqual(["s1"]);
  });

  it("既に現行バージョンなら何もしない", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, "4");
    // モックのsetItemは元からjest.fnなので、spyOn+mockRestoreで実装を消さないよう呼び出し履歴だけ消す
    const setItem = AsyncStorage.setItem as jest.Mock;
    setItem.mockClear();

    await migrateIfNeeded();

    expect(setItem).not.toHaveBeenCalled();
  });
});

describe("リマインド設定", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("未保存なら既定値を返す", async () => {
    expect(await getReminderSettings()).toEqual(DEFAULT_REMINDER_SETTINGS);
  });

  it("更新した値を読み出せる", async () => {
    await updateReminderSettings({ timeOverride: { hour: 21, minute: 30 } });

    expect(await getReminderSettings()).toEqual({
      ...DEFAULT_REMINDER_SETTINGS,
      timeOverride: { hour: 21, minute: 30 },
    });
  });

  it("JSONが破損していれば退避キーへ保存して既定値を返す", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.REMINDER_SETTINGS, "{not json");

    expect(await getReminderSettings()).toEqual(DEFAULT_REMINDER_SETTINGS);
    const backups = await corruptKeys();
    expect(backups).toHaveLength(1);
    expect(await AsyncStorage.getItem(backups[0])).toBe("{not json");
  });

  it("スキーマに合わなければ退避キーへ保存して既定値を返す", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.REMINDER_SETTINGS,
      JSON.stringify({ enabled: "yes", timeOverride: null, permissionPromptedAt: null }),
    );

    expect(await getReminderSettings()).toEqual(DEFAULT_REMINDER_SETTINGS);
    expect(await corruptKeys()).toHaveLength(1);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.REMINDER_SETTINGS)).toBeNull();
  });

  it("並行して更新しても互いの変更を消さない", async () => {
    const promptedAt = "2026-09-16T01:00:00.000Z";

    await Promise.all([
      updateReminderSettings({ permissionPromptedAt: promptedAt }),
      updateReminderSettings({ enabled: false }),
    ]);

    expect(await getReminderSettings()).toEqual({
      enabled: false,
      timeOverride: null,
      permissionPromptedAt: promptedAt,
    });
  });

  it("設定の保存でスキーマバージョンは変わらない", async () => {
    await updateReminderSettings({ enabled: false });

    expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe("4");
  });

  it("patchにundefinedのキーがあっても既存の値を消さない", async () => {
    await updateReminderSettings({ enabled: true });

    await updateReminderSettings({ enabled: undefined, timeOverride: { hour: 21, minute: 30 } });

    expect(await getReminderSettings()).toEqual({
      ...DEFAULT_REMINDER_SETTINGS,
      enabled: true,
      timeOverride: { hour: 21, minute: 30 },
    });
  });
});

describe("書き込み時の検証", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function quarantinedKeys(): Promise<string[]> {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter((k) => k.includes("__dropped_") || k.includes("__corrupt_"));
  }

  it("回数0の練習結果は保存せず、保存済みの記録は変わらない", async () => {
    await savePhraseAttempt(makeAttempt("a1", "p"));

    await expect(
      savePhraseAttempt({ ...makeAttempt("a2", "p"), reps: 0 }),
    ).rejects.toBeInstanceOf(StorageValidationError);

    expect((await getPhraseAttempts()).map((a) => a.id)).toEqual(["a1"]);
    expect(await quarantinedKeys()).toHaveLength(0);
  });

  it("終了点を開始点以下にする更新は保存せず、フレーズは元のまま", async () => {
    await savePracticePhrase(makePhrase("x"));

    await expect(updatePracticePhrase("x", { endSec: 10 })).rejects.toBeInstanceOf(
      StorageValidationError,
    );
    await expect(updatePracticePhrase("x", { endSec: 5 })).rejects.toBeInstanceOf(
      StorageValidationError,
    );

    expect(await getPracticePhrases()).toEqual([makePhrase("x")]);
    expect(await quarantinedKeys()).toHaveLength(0);
  });

  it("整数でないBPMの記録は保存せず、記録も到達BPMも変わらない", async () => {
    await savePracticePhrase(makePhrase("p"));

    await expect(
      recordPhraseResult({ ...makeAttempt("a1", "p"), bpm: 39.5, result: "ok" }),
    ).rejects.toBeInstanceOf(StorageValidationError);
    await expect(
      recordPhraseResult({ ...makeAttempt("a2", "p"), bpm: 120.5, result: "ok" }),
    ).rejects.toBeInstanceOf(StorageValidationError);

    expect(await getPhraseAttempts()).toEqual([]);
    expect((await getPracticePhrases())[0].currentBpm).toBe(80);
  });

  it("不正なフレーズは新規保存しない", async () => {
    await savePracticePhrase(makePhrase("ok"));

    await expect(
      savePracticePhrase({ ...makePhrase("bad"), targetBpm: 241 }),
    ).rejects.toBeInstanceOf(StorageValidationError);

    expect((await getPracticePhrases()).map((p) => p.id)).toEqual(["ok"]);
  });

  it("ISO 8601でない日時の練習セッションは保存しない", async () => {
    const session: PracticeSession = {
      id: "s1",
      date: "2026-04-27",
      duration: 60,
    };

    await expect(savePracticeSession(session)).rejects.toBeInstanceOf(StorageValidationError);
    expect(await getPracticeSessions()).toEqual([]);
  });

  it("0秒の練習セッションは保存しない", async () => {
    const session: PracticeSession = { id: "s1", date: "2026-04-27T12:00:00.000Z", duration: 0 };

    await expect(savePracticeSession(session)).rejects.toBeInstanceOf(StorageValidationError);
    expect(await getPracticeSessions()).toEqual([]);
  });

  it("同じIDの練習セッションを並行して2回保存しても1件だけ残る", async () => {
    const session: PracticeSession = { id: "s1", date: "2026-04-27T12:00:00.000Z", duration: 900 };

    await Promise.all([savePracticeSession(session), savePracticeSession(session)]);

    expect(await getPracticeSessions()).toEqual([session]);
  });

  it("正しい練習セッションは保存して読み出せる", async () => {
    const session: PracticeSession = {
      id: "s1",
      date: "2026-04-27T12:00:00.000Z",
      duration: 60,
      notes: "メモ",
    };

    await savePracticeSession(session);

    expect(await getPracticeSessions()).toEqual([session]);
  });

  it("お気に入り・最近の動画・リマインド設定も不正な値は保存しない", async () => {
    const badFavorite = { id: "f", videoId: "v", title: "t" } as unknown as FavoriteVideo;
    const badRecent = { videoId: "v", title: 1 } as unknown as RecentVideo;

    await expect(addFavoriteVideo(badFavorite)).rejects.toBeInstanceOf(StorageValidationError);
    await expect(addRecentVideo(badRecent)).rejects.toBeInstanceOf(StorageValidationError);
    await expect(
      updateReminderSettings({ permissionPromptedAt: "昨日" }),
    ).rejects.toBeInstanceOf(StorageValidationError);

    expect(await getFavoriteVideos()).toEqual([]);
    expect(await getRecentVideos()).toEqual([]);
    expect(await getReminderSettings()).toEqual(DEFAULT_REMINDER_SETTINGS);
  });
});

describe("読み出し失敗時の扱い（上書き消失防止）", () => {
  const VIDEO_ID = "abc123def45";
  const session: PracticeSession = { id: "s-new", date: "2026-09-03T00:00:00.000Z", duration: 60 };
  const favorite: FavoriteVideo = {
    id: "f-new",
    videoId: "zyx987wvu65",
    title: "新しいお気に入り",
    addedAt: "2026-09-03T00:00:00.000Z",
  };
  const recent: RecentVideo = {
    videoId: "zyx987wvu65",
    title: "新しい動画",
    lastWatchedAt: "2026-09-03T00:00:00.000Z",
  };

  /** 指定キーのgetItemだけを失敗させる。戻り値で元の実装に戻す */
  function failGetItemFor(targetKey: string): () => void {
    const getItem = AsyncStorage.getItem as jest.Mock;
    const original = getItem.getMockImplementation()!;
    getItem.mockImplementation(async (key: string) => {
      if (key === targetKey) throw new Error("Couldn't read row 0, col 0 from CursorWindow");
      return original(key);
    });
    return () => getItem.mockImplementation(original);
  }

  function setItemCallsFor(key: string): unknown[][] {
    return (AsyncStorage.setItem as jest.Mock).mock.calls.filter(([k]) => k === key);
  }

  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, "4");
    await AsyncStorage.setItem(STORAGE_KEYS.PRACTICE_PHRASES, JSON.stringify([makePhrase("p1")]));
    await AsyncStorage.setItem(
      STORAGE_KEYS.PHRASE_ATTEMPTS,
      JSON.stringify([makeAttempt("a1", "p1")]),
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.PRACTICE_SESSIONS,
      JSON.stringify([{ id: "s1", date: "2026-09-01T00:00:00.000Z", duration: 600 }]),
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.FAVORITE_VIDEOS,
      JSON.stringify([
        { id: "f1", videoId: VIDEO_ID, title: "お気に入り", addedAt: "2026-09-01T00:00:00.000Z" },
      ]),
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.RECENT_VIDEOS,
      JSON.stringify([{ videoId: VIDEO_ID, title: "最近", lastWatchedAt: "2026-09-01T00:00:00.000Z" }]),
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.REMINDER_SETTINGS,
      JSON.stringify({ ...DEFAULT_REMINDER_SETTINGS, enabled: false }),
    );
    (AsyncStorage.setItem as jest.Mock).mockClear();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const writes: [string, string, () => Promise<unknown>][] = [
    ["recordPhraseResult（結果の読み出し失敗）", STORAGE_KEYS.PHRASE_ATTEMPTS, () => recordPhraseResult({ ...makeAttempt("a2", "p1"), bpm: 90 })],
    ["recordPhraseResult（フレーズの読み出し失敗）", STORAGE_KEYS.PRACTICE_PHRASES, () => recordPhraseResult({ ...makeAttempt("a2", "p1"), bpm: 90 })],
    ["savePhraseAttempt", STORAGE_KEYS.PHRASE_ATTEMPTS, () => savePhraseAttempt(makeAttempt("a2", "p1"))],
    ["savePracticeSession", STORAGE_KEYS.PRACTICE_SESSIONS, () => savePracticeSession(session)],
    ["deletePracticeSession", STORAGE_KEYS.PRACTICE_SESSIONS, () => deletePracticeSession("s1")],
    ["deletePracticePhrase（結果の読み出し失敗）", STORAGE_KEYS.PHRASE_ATTEMPTS, () => deletePracticePhrase("p1")],
    ["deletePracticePhrase（フレーズの読み出し失敗）", STORAGE_KEYS.PRACTICE_PHRASES, () => deletePracticePhrase("p1")],
    ["savePracticePhrase", STORAGE_KEYS.PRACTICE_PHRASES, () => savePracticePhrase(makePhrase("p2"))],
    ["updatePracticePhrase", STORAGE_KEYS.PRACTICE_PHRASES, () => updatePracticePhrase("p1", { name: "改名" })],
    ["addFavoriteVideo", STORAGE_KEYS.FAVORITE_VIDEOS, () => addFavoriteVideo(favorite)],
    ["removeFavoriteVideo", STORAGE_KEYS.FAVORITE_VIDEOS, () => removeFavoriteVideo(VIDEO_ID)],
    ["addRecentVideo", STORAGE_KEYS.RECENT_VIDEOS, () => addRecentVideo(recent)],
    ["updateReminderSettings", STORAGE_KEYS.REMINDER_SETTINGS, () => updateReminderSettings({ enabled: true })],
  ];

  it.each(writes)("%s は reject し、そのキーへ書き込まない", async (_name, key, write) => {
    const before = await AsyncStorage.getItem(key);
    const restore = failGetItemFor(key);
    try {
      await expect(write()).rejects.toBeInstanceOf(StorageReadError);
      expect(setItemCallsFor(key)).toHaveLength(0);
    } finally {
      restore();
    }
    expect(await AsyncStorage.getItem(key)).toBe(before);
  });

  const reads: [string, string, () => Promise<unknown>][] = [
    ["getPhraseAttempts", STORAGE_KEYS.PHRASE_ATTEMPTS, getPhraseAttempts],
    ["getPracticePhrases", STORAGE_KEYS.PRACTICE_PHRASES, getPracticePhrases],
    ["getPracticeSessions", STORAGE_KEYS.PRACTICE_SESSIONS, getPracticeSessions],
    ["getFavoriteVideos", STORAGE_KEYS.FAVORITE_VIDEOS, getFavoriteVideos],
    ["getRecentVideos", STORAGE_KEYS.RECENT_VIDEOS, getRecentVideos],
    ["getReminderSettings", STORAGE_KEYS.REMINDER_SETTINGS, getReminderSettings],
  ];

  it.each(reads)("%s は空の一覧や既定値で resolve せず reject する", async (_name, key, read) => {
    const restore = failGetItemFor(key);
    try {
      await expect(read()).rejects.toBeInstanceOf(StorageReadError);
    } finally {
      restore();
    }
  });

  it("読み出しが回復すれば、以前の記録がそのまま読める", async () => {
    const restore = failGetItemFor(STORAGE_KEYS.PHRASE_ATTEMPTS);
    await expect(savePhraseAttempt(makeAttempt("a2", "p1"))).rejects.toBeInstanceOf(StorageReadError);
    restore();

    await savePhraseAttempt(makeAttempt("a2", "p1"));

    expect((await getPhraseAttempts()).map((a) => a.id)).toEqual(["a2", "a1"]);
  });
});
