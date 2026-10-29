import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { usePracticeStore } from "@/stores/practice";

/** 画面のフォーカスが外れたらメトロノームをOFFにする。フォーカスが戻っても自動ではONにしない */
export function useStopMetronomeOnBlur(): void {
  useFocusEffect(
    useCallback(() => {
      return () => usePracticeStore.getState().setMetronomeEnabled(false);
    }, []),
  );
}
