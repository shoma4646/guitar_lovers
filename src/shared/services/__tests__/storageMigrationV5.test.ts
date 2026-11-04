import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  STORAGE_KEYS,
  getPhraseAttempts,
  getPracticePhrases,
  migrateIfNeeded,
} from "../storage";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

const VALID_VIDEO_ID = "abc123def45";

function rawPhrase(id: string, videoId: unknown) {
  return {
    id,
    videoId,
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

function rawAttempt(id: string, phraseId: string) {
  return { id, phraseId, date: "2026-09-02T00:00:00.000Z", bpm: 85, result: "ok" };
}

async function droppedKeysFor(key: string): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((k) => k.startsWith(`${key}__dropped_`));
}

async function readDropped(key: string): Promise<unknown[]> {
  const keys = await droppedKeysFor(key);
  const lists = await Promise.all(
    keys.map(async (k) => JSON.parse((await AsyncStorage.getItem(k))!) as unknown[]),
  );
  return lists.flat();
}

describe("バージョン5への移行（動画IDが不正なフレーズ）", () => {
  const good = rawPhrase("good", VALID_VIDEO_ID);
  const broken = rawPhrase("broken", "dQw4w9WgX#t");
  const missing = rawPhrase("missing", undefined);
  const goodAttempt = rawAttempt("a-good", "good");
  const brokenAttempts = [rawAttempt("a-broken-1", "broken"), rawAttempt("a-broken-2", "broken")];
  const missingAttempt = rawAttempt("a-missing", "missing");

  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, "4");
    await AsyncStorage.setItem(
      STORAGE_KEYS.PRACTICE_PHRASES,
      JSON.stringify([good, broken, missing]),
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.PHRASE_ATTEMPTS,
      JSON.stringify([brokenAttempts[0], goodAttempt, brokenAttempts[1], missingAttempt]),
    );
  });

  it("不正なIDのフレーズとその練習結果を両方とも退避キーへ移す", async () => {
    await migrateIfNeeded();

    expect(await readDropped(STORAGE_KEYS.PRACTICE_PHRASES)).toEqual([broken, missing]);
    expect(await readDropped(STORAGE_KEYS.PHRASE_ATTEMPTS)).toEqual([
      brokenAttempts[0],
      brokenAttempts[1],
      missingAttempt,
    ]);
  });

  it("正しいIDのフレーズと練習結果は残る", async () => {
    await migrateIfNeeded();

    expect((await getPracticePhrases()).map((p) => p.id)).toEqual(["good"]);
    expect((await getPhraseAttempts()).map((a) => a.id)).toEqual(["a-good"]);
  });

  it("schema_versionが5になる", async () => {
    await migrateIfNeeded();

    expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe("5");
  });

  it("不正なIDのフレーズが無ければ退避キーを作らない", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.PRACTICE_PHRASES, JSON.stringify([good]));
    await AsyncStorage.setItem(STORAGE_KEYS.PHRASE_ATTEMPTS, JSON.stringify([goodAttempt]));

    await migrateIfNeeded();

    expect(await droppedKeysFor(STORAGE_KEYS.PRACTICE_PHRASES)).toHaveLength(0);
    expect(await droppedKeysFor(STORAGE_KEYS.PHRASE_ATTEMPTS)).toHaveLength(0);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe("5");
  });

  it("フレーズの書き込みに失敗しても、再実行で練習結果を孤立させずに移行を完了する", async () => {
    const setItem = AsyncStorage.setItem as jest.Mock;
    const original = setItem.getMockImplementation()!;
    let armed = true;
    setItem.mockImplementation(async (key: string, value: string) => {
      if (armed && key === STORAGE_KEYS.PRACTICE_PHRASES) {
        armed = false;
        throw new Error("disk full");
      }
      return original(key, value);
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      await migrateIfNeeded();
      expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe("4");
    } finally {
      setItem.mockImplementation(original);
      consoleError.mockRestore();
    }

    expect((await getPracticePhrases()).map((p) => p.id)).toEqual(["good"]);
    expect((await getPhraseAttempts()).map((a) => a.id)).toEqual(["a-good"]);
    expect(await readDropped(STORAGE_KEYS.PHRASE_ATTEMPTS)).toEqual([
      brokenAttempts[0],
      brokenAttempts[1],
      missingAttempt,
    ]);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe("5");
  });
});
