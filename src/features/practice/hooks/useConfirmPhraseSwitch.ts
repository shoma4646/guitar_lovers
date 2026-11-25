/**
 * 練習中に未記録の回数や未保存の区間・ブックマークがあるまま別フレーズ・別動画へ切り替える前の確認
 *
 * 「今日の練習メニュー」「プリセット」「お気に入り」「動画追加」「動画を閉じる」いずれの切り替え導線からも
 * 使う共通ガード。無警告で練習中状態や作りかけの区間が消えるのを防ぐ。
 */

import { useCallback } from "react";
import { Alert } from "react-native";
import { usePracticeStore } from "@/stores/practice";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { buildSwitchConfirmation, findUnsavedWork } from "@/features/practice/lib/unsavedWork";
import type { PracticePhrase } from "@/shared/types/models";

const NO_PHRASES: PracticePhrase[] = [];

/** 切り替え操作の性質 */
export type PhraseSwitchOptions = {
  /** 切り替え後も読み込み中の動画の区間・ブックマークを残す操作ならtrue（回数だけを確認の対象にする） */
  keepsLoopAndBookmarks?: boolean;
};

/**
 * 失うものがあれば確認してから切り替える関数を返す
 * 返す関数の proceed は切り替えるとき、onCancel は確認で「キャンセル」を選んだときに呼ぶ
 */
export function useConfirmPhraseSwitch(): (
  proceed: () => void,
  onCancel?: () => void,
  options?: PhraseSwitchOptions,
) => void {
  const savedPhrases = usePracticePhrases().data ?? NO_PHRASES;

  return useCallback(
    (proceed: () => void, onCancel?: () => void, options?: PhraseSwitchOptions) => {
      const { activePhrasePractice, abLoop, bookmarks, loadedVideoId } = usePracticeStore.getState();
      const confirmation = buildSwitchConfirmation({
        practiceRecord: activePhrasePractice
          ? { phraseName: activePhrasePractice.phrase.name, completedReps: activePhrasePractice.completedReps }
          : null,
        unsaved: options?.keepsLoopAndBookmarks
          ? { unsavedRange: null, bookmarkCount: 0 }
          : findUnsavedWork({ abLoop, bookmarks, loadedVideoId, savedPhrases }),
      });
      if (!confirmation) {
        proceed();
        return;
      }
      Alert.alert(confirmation.title, confirmation.message, [
        { text: "キャンセル", style: "cancel", onPress: onCancel },
        { text: "切り替える", style: "destructive", onPress: proceed },
      ]);
    },
    [savedPhrases],
  );
}
