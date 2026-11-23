import { z } from "zod";
import { TUNING_PRESET_KEYS } from "@/shared/constants/tuning";

/** チューナー設定のZodスキーマ。AsyncStorage復元値をパースする */
export const tunerSettingsSchema = z.object({
  /** 最後に選んだチューニングプリセット */
  preset: z.enum(TUNING_PRESET_KEYS),
});

export type TunerSettings = z.infer<typeof tunerSettingsSchema>;

/** 保存値が無い・読めないときのチューナー設定 */
export const DEFAULT_TUNER_SETTINGS: TunerSettings = { preset: "standard" };
