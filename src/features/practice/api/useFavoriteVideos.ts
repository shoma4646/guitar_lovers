import { useQuery } from "@tanstack/react-query";
import { getFavoriteVideos } from "@/shared/services/storage";
import type { FavoriteVideo } from "@/shared/types/models";

export const favoriteVideosQueryKey = ["practice", "favorites"] as const;

/** お気に入り動画一覧をAsyncStorageから取得する */
export function useFavoriteVideos() {
  return useQuery<FavoriteVideo[]>({
    queryKey: favoriteVideosQueryKey,
    queryFn: getFavoriteVideos,
  });
}
