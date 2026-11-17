/**
 * 練習タブのフォーカスに応じたプレイヤー制御
 */

import type { PlaybackRate } from "@/shared/constants/playback";

/** アプリからプレイヤーHTMLへ送るコマンド。プレイヤー側は知らない action やキーを黙って無視する */
export type PlayerCommand =
  | { action: "setLoop"; enabled: boolean; pointA: number | null; pointB: number | null }
  | { action: "play" }
  | { action: "pause" }
  | { action: "seek"; time: number }
  | { action: "setRate"; rate: PlaybackRate };

/** プレイヤーへコマンドを送る関数 */
export type SendToPlayer = (cmd: PlayerCommand) => void;

/**
 * 練習タブを離れたときの処理。動画を読み込み済みなら一時停止を1回送り、未読み込みなら何もしない
 * @param sendToPlayer - プレイヤーへコマンドを送る関数
 * @param hasVideo - プレイヤー（WebView）が表示されているか
 */
export function onPracticeBlur(
  sendToPlayer: SendToPlayer,
  hasVideo: boolean,
): void {
  if (hasVideo) {
    sendToPlayer({ action: "pause" });
  }
}
