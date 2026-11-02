import { z } from "zod";
import { youtubeVideoIdSchema } from "./youtubeVideoId";

/** 最近視聴した動画のZodスキーマ */
export const recentVideoSchema = z.object({
  videoId: youtubeVideoIdSchema,
  title: z.string(),
  lastWatchedAt: z.string(),
});

export const recentVideosSchema = z.array(recentVideoSchema);
