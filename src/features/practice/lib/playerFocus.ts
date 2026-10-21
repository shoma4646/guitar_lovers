/**
 * 練習タブのフォーカスに応じたプレイヤー制御
 */

/** プレイヤーへ送るコマンド */
export type PlayerCommand = Record<string, unknown>;

/**
 * 練習タブを離れたときの処理。動画を読み込み済みなら一時停止を1回送り、未読み込みなら何もしない
 * @param sendToPlayer - プレイヤーへコマンドを送る関数
 * @param hasVideo - プレイヤー（WebView）が表示されているか
 */
export function onPracticeBlur(
  sendToPlayer: (cmd: PlayerCommand) => void,
  hasVideo: boolean,
): void {
  if (hasVideo) {
    sendToPlayer({ action: "pause" });
  }
}
