import { useCallback } from "react";
import { usePracticeStore } from "@/stores/practice";
import { useConfirmPhraseSwitch } from "./useConfirmPhraseSwitch";

/** 読み込み中の動画を閉じる操作を返す。未記録の回数があれば確認してから閉じる */
export function useCloseVideo(): () => void {
  const confirmSwitch = useConfirmPhraseSwitch();
  const clearVideo = usePracticeStore((s) => s.clearVideo);
  const setToolsSheetOpen = usePracticeStore((s) => s.setToolsSheetOpen);

  return useCallback(() => {
    confirmSwitch(() => {
      setToolsSheetOpen(false);
      clearVideo();
    });
  }, [confirmSwitch, setToolsSheetOpen, clearVideo]);
}
