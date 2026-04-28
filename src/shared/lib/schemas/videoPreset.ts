import { z } from "zod";

/** プリセット動画のZodスキーマ */
export const videoPresetSchema = z.object({
  id: z.string(),
  videoId: z.string(),
  title: z.string(),
  category: z.string(),
  thumbnail: z.string().optional(),
});

export const videoPresetsSchema = z.array(videoPresetSchema);
