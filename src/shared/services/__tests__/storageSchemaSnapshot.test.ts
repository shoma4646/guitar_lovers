// 保存データの型を変えたら SCHEMA_VERSION を上げ、ensureMigratedUnlocked に移行を足してからスナップショットを更新する
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { z } from "zod";
import { SCHEMA_VERSION } from "../storage";
import { practiceSessionSchema } from "@/shared/lib/schemas/practiceSession";
import { practicePhraseSchema } from "@/shared/lib/schemas/practicePhrase";
import { phraseAttemptSchema } from "@/shared/lib/schemas/phraseAttempt";
import { favoriteVideoSchema } from "@/shared/lib/schemas/favoriteVideo";
import { recentVideoSchema } from "@/shared/lib/schemas/recentVideo";
import { reminderSettingsSchema } from "@/shared/lib/schemas/reminderSettings";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

describe("保存データの形式とスキーマバージョン", () => {
  it("形式を変えたときはスキーマバージョンも上がっている", () => {
    const schemas = {
      practiceSession: z.toJSONSchema(practiceSessionSchema),
      practicePhrase: z.toJSONSchema(practicePhraseSchema),
      phraseAttempt: z.toJSONSchema(phraseAttemptSchema),
      favoriteVideo: z.toJSONSchema(favoriteVideoSchema),
      recentVideo: z.toJSONSchema(recentVideoSchema),
      reminderSettings: z.toJSONSchema(reminderSettingsSchema),
    };

    expect({ SCHEMA_VERSION, schemas }).toMatchSnapshot(`schema v${SCHEMA_VERSION}`);
  });
});
