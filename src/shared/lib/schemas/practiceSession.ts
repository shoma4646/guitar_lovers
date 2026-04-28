import { z } from "zod";

/** 練習セッションのZodスキーマ。AsyncStorage復元値をパースする */
export const practiceSessionSchema = z.object({
  id: z.string(),
  date: z.string(),
  duration: z.number().nonnegative(),
  videoUrl: z.string().optional(),
  videoId: z.string().optional(),
  videoTitle: z.string().optional(),
  notes: z.string().optional(),
});

export const practiceSessionsSchema = z.array(practiceSessionSchema);

export type PracticeSessionParsed = z.infer<typeof practiceSessionSchema>;
