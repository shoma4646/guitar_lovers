import { z } from "zod";

/** 練習セッションのZodスキーマ。AsyncStorageの読み書きの両方で検証に使う */
export const practiceSessionSchema = z.object({
  id: z.string(),
  /** 練習日時（ISO 8601形式） */
  date: z.iso.datetime(),
  /** 練習時間（秒） */
  duration: z.number().nonnegative(),
  videoUrl: z.string().optional(),
  videoId: z.string().optional(),
  videoTitle: z.string().optional(),
  notes: z.string().optional(),
});

export const practiceSessionsSchema = z.array(practiceSessionSchema);
