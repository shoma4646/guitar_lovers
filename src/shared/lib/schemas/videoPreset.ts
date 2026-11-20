import { z } from "zod";
import { youtubeVideoIdSchema } from "./youtubeVideoId";

/** プリセット動画のカテゴリ一覧 */
export const PRESET_CATEGORIES = [
  "chord",
  "scale",
  "fingerpicking",
  "strumming",
  "technique",
] as const;

/** プリセット動画のZodスキーマ */
export const videoPresetSchema = z.object({
  id: z.string(),
  videoId: youtubeVideoIdSchema,
  title: z.string(),
  category: z.enum(PRESET_CATEGORIES),
  thumbnail: z.string().optional(),
});
