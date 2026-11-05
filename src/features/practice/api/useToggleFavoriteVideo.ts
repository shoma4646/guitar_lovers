import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addFavoriteVideo,
  removeFavoriteVideo,
} from "@/shared/services/storage";
import type { FavoriteVideo } from "@/shared/types/models";
import { showMutationError } from "@/shared/lib/showMutationError";
import { SKIP_REMINDER_SYNC_META } from "@/features/reminder/services/reminderSyncSubscription";
import { favoriteVideosQueryKey } from "./useFavoriteVideos";

type ToggleArgs =
  | { type: "add"; video: FavoriteVideo }
  | { type: "remove"; videoId: string };

/** お気に入り動画の追加/削除を切り替える */
export function useToggleFavoriteVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: SKIP_REMINDER_SYNC_META,
    mutationFn: async (args: ToggleArgs) => {
      if (args.type === "add") {
        await addFavoriteVideo(args.video);
      } else {
        await removeFavoriteVideo(args.videoId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteVideosQueryKey });
    },
    onError: showMutationError,
  });
}
