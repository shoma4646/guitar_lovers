import { z } from "zod";
import { youtubeVideoIdSchema } from "./youtubeVideoId";

/** お気に入り動画のZodスキーマ */
export const favoriteVideoSchema = z.object({
  id: z.string(),
  videoId: youtubeVideoIdSchema,
  title: z.string(),
  addedAt: z.string(),
});

export const favoriteVideosSchema = z.array(favoriteVideoSchema);
