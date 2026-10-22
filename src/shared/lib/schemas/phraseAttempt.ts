import { z } from "zod";
import { BPM_MAX, BPM_MIN } from "@/shared/constants/bpm";

/** フレーズ練習結果のZodスキーマ。AsyncStorageの読み書きの両方で検証に使う */
export const phraseAttemptSchema = z.object({
  id: z.string(),
  phraseId: z.string(),
  /** 練習日時（ISO 8601形式） */
  date: z.iso.datetime(),
  /** その回のBPM */
  bpm: z.number().int().min(BPM_MIN).max(BPM_MAX),
  /** 結果。ok=弾けた / partial=あやしい / ng=弾けなかった */
  result: z.enum(["ok", "partial", "ng"]),
  // 必須にすると回数を持たない既存レコードがreadListで全件退避される
  /** その回に弾いた回数（任意） */
  reps: z.number().int().positive().optional(),
});

export const phraseAttemptsSchema = z.array(phraseAttemptSchema);
