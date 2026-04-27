import { useQuery } from "@tanstack/react-query";
import type { VideoPreset } from "@/shared/types/models";

const practicePresetsData: VideoPreset[] = require("../../../../assets/json/practice_presets.json");

export const videoPresetsQueryKey = ["practice", "presets"] as const;

/** 練習プリセット動画一覧を取得する。現状は静的JSONアセットをラップする */
export function useVideoPresets() {
  return useQuery<VideoPreset[]>({
    queryKey: videoPresetsQueryKey,
    queryFn: async () => practicePresetsData,
    staleTime: Infinity,
  });
}
