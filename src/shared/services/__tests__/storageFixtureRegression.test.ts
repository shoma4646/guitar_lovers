import fs from "fs";
import path from "path";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SCHEMA_VERSION,
  STORAGE_KEYS,
  getFavoriteVideos,
  getPhraseAttempts,
  getPracticePhrases,
  getPracticeSessions,
  getRecentVideos,
  getReminderSettings,
} from "../storage";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

type StorageFixture = {
  schemaVersion: number;
  practicePhrases: unknown[];
  phraseAttempts: unknown[];
  practiceSessions: unknown[];
  favoriteVideos: unknown[];
  recentVideos: unknown[];
  reminderSettings: unknown;
};

const FIXTURE_DIR = path.join(__dirname, "__fixtures__");

const fixtures = fs
  .readdirSync(FIXTURE_DIR)
  .filter((name) => /^storage-v\d+\.json$/.test(name))
  .map((name) => {
    const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8")) as StorageFixture;
    return { name, fixture };
  });

async function seed(fixture: StorageFixture): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.SCHEMA_VERSION, String(fixture.schemaVersion)],
    [STORAGE_KEYS.PRACTICE_PHRASES, JSON.stringify(fixture.practicePhrases)],
    [STORAGE_KEYS.PHRASE_ATTEMPTS, JSON.stringify(fixture.phraseAttempts)],
    [STORAGE_KEYS.PRACTICE_SESSIONS, JSON.stringify(fixture.practiceSessions)],
    [STORAGE_KEYS.FAVORITE_VIDEOS, JSON.stringify(fixture.favoriteVideos)],
    [STORAGE_KEYS.RECENT_VIDEOS, JSON.stringify(fixture.recentVideos)],
    [STORAGE_KEYS.REMINDER_SETTINGS, JSON.stringify(fixture.reminderSettings)],
  ]);
}

async function readAll() {
  return {
    practicePhrases: await getPracticePhrases(),
    phraseAttempts: await getPhraseAttempts(),
    practiceSessions: await getPracticeSessions(),
    favoriteVideos: await getFavoriteVideos(),
    recentVideos: await getRecentVideos(),
    reminderSettings: await getReminderSettings(),
  };
}

async function quarantinedKeys(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((key) => key.includes("__dropped_") || key.includes("__corrupt_"));
}

describe("過去の版で保存されたデータの見本を今の読み出し経路で読む", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("見本が1つ以上あり、今の版の見本も含まれている", () => {
    expect(fixtures.map(({ fixture }) => fixture.schemaVersion)).toContain(SCHEMA_VERSION);
  });

  it.each(fixtures)("$name の全件が残り、退避キーが1つもできない", async ({ fixture }) => {
    await seed(fixture);

    const loaded = await readAll();

    expect(await quarantinedKeys()).toEqual([]);
    expect(loaded.practicePhrases).toHaveLength(fixture.practicePhrases.length);
    expect(loaded.phraseAttempts).toHaveLength(fixture.phraseAttempts.length);
    expect(loaded.practiceSessions).toHaveLength(fixture.practiceSessions.length);
    expect(loaded.favoriteVideos).toHaveLength(fixture.favoriteVideos.length);
    expect(loaded.recentVideos).toHaveLength(fixture.recentVideos.length);
  });

  it.each(fixtures.filter(({ fixture }) => fixture.schemaVersion === SCHEMA_VERSION))(
    "今の版の見本（$name）はそのままの値で返る",
    async ({ fixture }) => {
      await seed(fixture);

      const { schemaVersion: _schemaVersion, ...expected } = fixture;
      expect(await readAll()).toEqual(expected);
    },
  );
});
