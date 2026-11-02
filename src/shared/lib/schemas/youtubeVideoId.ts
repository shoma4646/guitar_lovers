import { z } from "zod";

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** YouTube動画IDの形式（英数字・`-`・`_`の11文字）かを返す */
export function isYouTubeVideoId(value: string): boolean {
  return YOUTUBE_VIDEO_ID_PATTERN.test(value);
}

/** YouTube動画IDのZodスキーマ。保存データの動画IDはすべてこれで検証する */
export const youtubeVideoIdSchema = z.string().regex(YOUTUBE_VIDEO_ID_PATTERN);
