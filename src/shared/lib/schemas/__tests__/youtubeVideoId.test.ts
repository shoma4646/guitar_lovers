import { favoriteVideoSchema } from "../favoriteVideo";
import { recentVideoSchema } from "../recentVideo";
import { videoPresetSchema } from "../videoPreset";
import { isYouTubeVideoId } from "../youtubeVideoId";

const VALID_ID = "dQw4w9WgXcQ";
const INVALID_IDS = ["dQw4w9WgX#t", "abc#v=dQw4w", "dQw4w9W%27%3E", "dQw4w9WgXc", "dQw4w9WgXcQQ", ""];

describe("isYouTubeVideoId", () => {
  it("英数字・-・_の11文字だけを受け付ける", () => {
    expect(isYouTubeVideoId(VALID_ID)).toBe(true);
    expect(isYouTubeVideoId("a-b_c-d_e-f")).toBe(true);
    for (const id of INVALID_IDS) {
      expect(isYouTubeVideoId(id)).toBe(false);
    }
  });
});

describe("保存データのスキーマは不正な動画IDを拒否する", () => {
  const cases = [
    ["最近開いた動画", recentVideoSchema, { title: "曲", lastWatchedAt: "2026-09-01T00:00:00.000Z" }],
    ["お気に入り", favoriteVideoSchema, { id: "f1", title: "曲", addedAt: "2026-09-01T00:00:00.000Z" }],
    ["プリセット", videoPresetSchema, { id: "p1", title: "曲", category: "rock" }],
  ] as const;

  it.each(cases)("%s: 正しいIDは通り、不正なIDは失敗する", (_label, schema, rest) => {
    expect(schema.safeParse({ ...rest, videoId: VALID_ID }).success).toBe(true);
    for (const videoId of INVALID_IDS) {
      expect(schema.safeParse({ ...rest, videoId }).success).toBe(false);
    }
  });
});
