import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addRecentVideo } from "@/shared/services/storage";
import type { RecentVideo } from "@/shared/types/models";
import { recentVideosQueryKey } from "./useRecentVideos";

/** 最近視聴した動画リストに追加する */
export function useAddRecentVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (video: RecentVideo) => addRecentVideo(video),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recentVideosQueryKey });
    },
  });
}
