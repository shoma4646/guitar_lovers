import { useCallback, useEffect, useRef } from "react";
import type { ABLoop } from "@/shared/types/models";
import type { PlayerCommand } from "@/features/practice/lib/playerFocus";

/** ABループの区間をプレイヤーHTMLへ渡す setLoop コマンドを作る */
export function buildSetLoopCommand(abLoop: ABLoop): PlayerCommand {
  return {
    action: "setLoop",
    enabled: abLoop.enabled,
    pointA: abLoop.pointA,
    pointB: abLoop.pointB,
  };
}

/**
 * ABループの区間（A点・B点・有効/無効）が変わるたびにプレイヤーへ送る。
 * 返す関数はプレイヤーの準備完了時に呼び、読み込み直後に届かなかった区間を送り直す
 * @param abLoop - 現在のABループ設定
 * @param sendToPlayer - プレイヤーへコマンドを送る関数
 */
export function useSyncPlayerLoop(
  abLoop: ABLoop,
  sendToPlayer: (cmd: PlayerCommand) => void,
): () => void {
  const abLoopRef = useRef(abLoop);
  abLoopRef.current = abLoop;
  const { enabled, pointA, pointB } = abLoop;

  useEffect(() => {
    sendToPlayer(buildSetLoopCommand({ enabled, pointA, pointB }));
  }, [enabled, pointA, pointB, sendToPlayer]);

  return useCallback(() => {
    sendToPlayer(buildSetLoopCommand(abLoopRef.current));
  }, [sendToPlayer]);
}
