import { z } from "zod";
import { youtubeVideoIdSchema } from "./youtubeVideoId";

/** プリセット動画のZodスキーマ */
export const videoPresetSchema = z.object({
  id: z.string(),
  videoId: youtubeVideoIdSchema,
  title: z.string(),
  category: z.string(),
  thumbnail: z.string().optional(),
});

export const videoPresetsSchema = z.array(videoPresetSchema);
