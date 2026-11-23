import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SCHEMA_VERSION,
  STORAGE_KEYS,
  StorageValidationError,
  getTunerSettings,
  saveTunerSettings,
} from "../storage";
import type { TunerSettings } from "@/shared/lib/schemas/tunerSettings";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, String(SCHEMA_VERSION));
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore();
});

describe("チューナー設定の保存と読み出し", () => {
  it("未保存ならスタンダードを返す", async () => {
    await expect(getTunerSettings()).resolves.toEqual({ preset: "standard" });
  });

  it("保存したプリセットを読み出せる", async () => {
    await saveTunerSettings({ preset: "dropD" });

    await expect(getTunerSettings()).resolves.toEqual({ preset: "dropD" });
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.TUNER_SETTINGS))!)).toEqual({
      preset: "dropD",
    });
  });

  it("不正な保存値は退避してスタンダードを返す", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.TUNER_SETTINGS, JSON.stringify({ preset: "openG" }));

    await expect(getTunerSettings()).resolves.toEqual({ preset: "standard" });
    expect(await AsyncStorage.getItem(STORAGE_KEYS.TUNER_SETTINGS)).toBeNull();
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((key) => key.startsWith(`${STORAGE_KEYS.TUNER_SETTINGS}__corrupt_`))).toBe(true);
  });

  it("スキーマに合わない値は保存せずStorageValidationErrorにする", async () => {
    await saveTunerSettings({ preset: "halfStepDown" });

    await expect(
      saveTunerSettings({ preset: "openG" } as unknown as TunerSettings),
    ).rejects.toBeInstanceOf(StorageValidationError);
    await expect(getTunerSettings()).resolves.toEqual({ preset: "halfStepDown" });
  });
});
