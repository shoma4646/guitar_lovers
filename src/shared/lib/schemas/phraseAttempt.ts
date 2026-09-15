import { z } from "zod";
import { BPM_MAX, BPM_MIN } from "@/shared/constants/bpm";

/** フレーズ練習結果のZodスキーマ。AsyncStorage復元値をパースする */
export const phraseAttemptSchema = z.object({
  id: z.string(),
  phraseId: z.string(),
  date: z.iso.datetime(),
  bpm: z.number().int().min(BPM_MIN).max(BPM_MAX),
  result: z.enum(["ok", "partial", "ng"]),
  // 必須にすると回数を持たない既存レコードがreadListで全件退避される
  reps: z.number().int().positive().optional(),
});

export const phraseAttemptsSchema = z.array(phraseAttemptSchema);

export type PhraseAttemptParsed = z.infer<typeof phraseAttemptSchema>;
