import { useQuery } from "@tanstack/react-query";
import type { VideoPreset } from "@/shared/types/models";
import { videoPresetSchema } from "@/shared/lib/schemas/videoPreset";

const rawPracticePresetsData: unknown = require("../../../../assets/json/practice_presets.json");

export const videoPresetsQueryKey = ["practice", "presets"] as const;

function parseVideoPresets(raw: unknown): VideoPreset[] {
  if (!Array.isArray(raw)) {
    console.error("[useVideoPresets] practice_presets.jsonが配列ではない", raw);
    return [];
  }
  return raw.flatMap((item: unknown, index) => {
    const parsed = videoPresetSchema.safeParse(item);
    if (parsed.success) return [parsed.data];
    console.error(
      `[useVideoPresets] practice_presets.jsonの${index}番目の検証に失敗`,
      parsed.error,
    );
    return [];
  });
}

/** 練習プリセット動画一覧を取得する。静的JSONアセットを要素ごとにZod検証し、壊れた要素だけを除く */
export function useVideoPresets() {
  return useQuery<VideoPreset[]>({
    queryKey: videoPresetsQueryKey,
    queryFn: async () => parseVideoPresets(rawPracticePresetsData),
    staleTime: Infinity,
  });
}
