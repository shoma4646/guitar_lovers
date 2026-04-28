import { z } from "zod";

/** お気に入り動画のZodスキーマ */
export const favoriteVideoSchema = z.object({
  id: z.string(),
  videoId: z.string(),
  title: z.string(),
  addedAt: z.string(),
});

export const favoriteVideosSchema = z.array(favoriteVideoSchema);
