import { useEffect } from "react";
import { usePracticeStore } from "@/stores/practice";
import { useAddRecentVideo } from "@/features/practice/api/useAddRecentVideo";
import { isYouTubeVideoId } from "@/shared/lib/schemas/youtubeVideoId";

/**
 * 読み込む動画が変わるたびに「最近見た動画」へ記録する（何も描画しない）
 *
 * 動画を開く入口に依らず記録するため、ルートレイアウトに1つだけ置く。
 * 同じ動画のままフレーズを切り替えた・読み込み直しただけでは記録しない
 */
export function RecentVideoRecorder() {
  const { mutate: addRecent } = useAddRecentVideo();

  useEffect(
    () =>
      usePracticeStore.subscribe((state, prev) => {
        const videoId = state.loadedVideoId;
        if (videoId === null || videoId === prev.loadedVideoId) return;
        if (!isYouTubeVideoId(videoId)) return;
        addRecent({ videoId, title: state.videoTitle, lastWatchedAt: new Date().toISOString() });
      }),
    [addRecent],
  );

  return null;
}
