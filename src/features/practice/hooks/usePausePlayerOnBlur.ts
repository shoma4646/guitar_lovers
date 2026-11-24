import { useCallback } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { onPracticeBlur, type SendToPlayer } from "@/features/practice/lib/playerFocus";

/**
 * 画面のフォーカスが外れたとき、またはフォーカス中にアプリが裏に回ったとき（background）に動画を一時停止する。
 * フォーカスや前面に戻っても自動では再生しない
 * @param sendToPlayer - プレイヤーへコマンドを送る関数
 * @param hasVideo - 一時停止する時点でプレイヤーが表示されているかを返す関数
 */
export function usePausePlayerOnBlur(
  sendToPlayer: SendToPlayer,
  hasVideo: () => boolean,
): void {
  useFocusEffect(
    useCallback(() => {
      // inactive（コントロールセンター・着信バナー）は画面がまだ見えているので止めない
      const subscription = AppState.addEventListener("change", (nextState) => {
        if (nextState === "background") onPracticeBlur(sendToPlayer, hasVideo());
      });
      return () => {
        subscription.remove();
        onPracticeBlur(sendToPlayer, hasVideo());
      };
    }, [sendToPlayer, hasVideo]),
  );
}
