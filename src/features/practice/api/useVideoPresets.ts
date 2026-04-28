import { useQuery } from "@tanstack/react-query";
import type { VideoPreset } from "@/shared/types/models";
import { videoPresetsSchema } from "@/shared/lib/schemas/videoPreset";

const rawPracticePresetsData: unknown = require("../../../../assets/json/practice_presets.json");

export const videoPresetsQueryKey = ["practice", "presets"] as const;

/** 練習プリセット動画一覧を取得する。静的JSONアセットをZod検証してラップする */
export function useVideoPresets() {
  return useQuery<VideoPreset[]>({
    queryKey: videoPresetsQueryKey,
    queryFn: async () => {
      const parsed = videoPresetsSchema.safeParse(rawPracticePresetsData);
      if (!parsed.success) {
        console.error(
          "[useVideoPresets] practice_presets.jsonの検証に失敗",
          parsed.error,
        );
        return [];
      }
      return parsed.data;
    },
    staleTime: Infinity,
  });
}
