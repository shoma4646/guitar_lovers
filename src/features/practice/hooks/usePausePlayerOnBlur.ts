import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { onPracticeBlur, type PlayerCommand } from "@/features/practice/lib/playerFocus";

/**
 * 画面のフォーカスが外れたら動画を一時停止する。フォーカスが戻っても自動では再生しない
 * @param sendToPlayer - プレイヤーへコマンドを送る関数
 * @param hasVideo - フォーカスが外れた時点でプレイヤーが表示されているかを返す関数
 */
export function usePausePlayerOnBlur(
  sendToPlayer: (cmd: PlayerCommand) => void,
  hasVideo: () => boolean,
): void {
  useFocusEffect(
    useCallback(() => {
      return () => onPracticeBlur(sendToPlayer, hasVideo());
    }, [sendToPlayer, hasVideo]),
  );
}
