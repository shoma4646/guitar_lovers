/**
 * 練習中に未記録の回数があるまま別フレーズ・別動画へ切り替える前の確認
 *
 * 「今日の練習メニュー」「プリセット」「お気に入り」「動画追加」いずれの切り替え導線からも
 * 使う共通ガード。回数を弾いているのに無警告で練習中状態が消えるのを防ぐ。
 */

import { useCallback } from "react";
import { Alert } from "react-native";
import { usePracticeStore } from "@/stores/practice";

export function useConfirmPhraseSwitch(): (proceed: () => void) => void {
  const activePractice = usePracticeStore((s) => s.activePhrasePractice);

  return useCallback(
    (proceed: () => void) => {
      if (!activePractice || activePractice.completedReps === 0) {
        proceed();
        return;
      }
      Alert.alert(
        "練習中の記録が消えます",
        `「${activePractice.phrase.name}」を${activePractice.completedReps}回弾いた記録はまだ保存されていません。切り替えると失われます。`,
        [
          { text: "キャンセル", style: "cancel" },
          { text: "切り替える", style: "destructive", onPress: proceed },
        ],
      );
    },
    [activePractice],
  );
}
