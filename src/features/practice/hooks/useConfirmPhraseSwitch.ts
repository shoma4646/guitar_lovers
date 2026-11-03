/**
 * 練習中に未記録の回数があるまま別フレーズ・別動画へ切り替える前の確認
 *
 * 「今日の練習メニュー」「プリセット」「お気に入り」「動画追加」いずれの切り替え導線からも
 * 使う共通ガード。回数を弾いているのに無警告で練習中状態が消えるのを防ぐ。
 */

import { useCallback } from "react";
import { Alert } from "react-native";
import { usePracticeStore } from "@/stores/practice";

/**
 * 未記録の回数があれば確認してから切り替える関数を返す
 * 返す関数の proceed は切り替えるとき、onCancel は確認で「キャンセル」を選んだときに呼ぶ
 */
export function useConfirmPhraseSwitch(): (proceed: () => void, onCancel?: () => void) => void {
  const activePractice = usePracticeStore((s) => s.activePhrasePractice);

  return useCallback(
    (proceed: () => void, onCancel?: () => void) => {
      if (!activePractice || activePractice.completedReps === 0) {
        proceed();
        return;
      }
      Alert.alert(
        "練習中の記録が消えます",
        `「${activePractice.phrase.name}」を${activePractice.completedReps}回弾いた記録はまだ保存されていません。切り替えると失われます。`,
        [
          { text: "キャンセル", style: "cancel", onPress: onCancel },
          { text: "切り替える", style: "destructive", onPress: proceed },
        ],
      );
    },
    [activePractice],
  );
}
