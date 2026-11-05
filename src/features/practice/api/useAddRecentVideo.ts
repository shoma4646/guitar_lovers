import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addRecentVideo } from "@/shared/services/storage";
import type { RecentVideo } from "@/shared/types/models";
import { showMutationError } from "@/shared/lib/showMutationError";
import { SKIP_REMINDER_SYNC_META } from "@/features/reminder/services/reminderSyncSubscription";
import { recentVideosQueryKey } from "./useRecentVideos";

/** 最近視聴した動画リストに追加する */
export function useAddRecentVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: SKIP_REMINDER_SYNC_META,
    mutationFn: (video: RecentVideo) => addRecentVideo(video),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recentVideosQueryKey });
    },
    onError: showMutationError,
  });
}
