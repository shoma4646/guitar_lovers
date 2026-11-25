import { useCallback } from "react";
import { Alert } from "react-native";
import { usePracticeStore } from "@/stores/practice";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { buildClearLoopConfirmation, findUnsavedWork } from "@/features/practice/lib/unsavedWork";
import type { PracticePhrase } from "@/shared/types/models";

const NO_PHRASES: PracticePhrase[] = [];

/** ABループを解除する操作を返す。まだ保存していない有効な区間なら確認してから解除する */
export function useClearLoopWithConfirm(): () => void {
  const savedPhrases = usePracticePhrases().data ?? NO_PHRASES;
  const clearABLoop = usePracticeStore((s) => s.clearABLoop);

  return useCallback(() => {
    const { abLoop, bookmarks, loadedVideoId } = usePracticeStore.getState();
    const { unsavedRange } = findUnsavedWork({ abLoop, bookmarks, loadedVideoId, savedPhrases });
    if (!unsavedRange) {
      clearABLoop();
      return;
    }
    const { title, message } = buildClearLoopConfirmation(unsavedRange);
    Alert.alert(title, message, [
      { text: "キャンセル", style: "cancel" },
      { text: "解除する", style: "destructive", onPress: clearABLoop },
    ]);
  }, [savedPhrases, clearABLoop]);
}
