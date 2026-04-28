import { z } from "zod";

/** 最近視聴した動画のZodスキーマ */
export const recentVideoSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  lastWatchedAt: z.string(),
});

export const recentVideosSchema = z.array(recentVideoSchema);
