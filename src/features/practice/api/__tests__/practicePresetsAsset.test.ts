import { z } from "zod";
import { videoPresetSchema } from "@/shared/lib/schemas/videoPreset";

const rawPresets: unknown = require("../../../../../assets/json/practice_presets.json");

const identitySchema = z.array(z.object({ id: z.string(), videoId: z.string() }));

describe("同梱の見本動画データ（practice_presets.json）", () => {
  it("1件以上あり、全件がスキーマを満たす", () => {
    const result = z.array(videoPresetSchema).min(1).safeParse(rawPresets);
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it("id が重複していない", () => {
    const ids = identitySchema.parse(rawPresets).map((p) => p.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it("videoId が重複していない", () => {
    const videoIds = identitySchema.parse(rawPresets).map((p) => p.videoId);
    expect(videoIds.filter((id, i) => videoIds.indexOf(id) !== i)).toEqual([]);
  });
});
