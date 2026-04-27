import { useQuery } from "@tanstack/react-query";
import { getRecentVideos } from "@/shared/services/storage";
import type { RecentVideo } from "@/shared/types/models";

export const recentVideosQueryKey = ["practice", "recents"] as const;

/** 最近視聴した動画一覧をAsyncStorageから取得する */
export function useRecentVideos() {
  return useQuery<RecentVideo[]>({
    queryKey: recentVideosQueryKey,
    queryFn: getRecentVideos,
  });
}
