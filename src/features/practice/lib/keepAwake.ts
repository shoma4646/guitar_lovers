/** 練習画面で画面ロックを抑止するときのタグ */
export const PRACTICE_KEEP_AWAKE_TAG = "practice";

/**
 * 練習画面で画面の自動ロックを抑止すべきかを返す
 * フレーズ練習中か、メトロノームがONのときだけ抑止する（動画を読み込んだだけでは抑止しない）
 */
export function shouldKeepAwakeDuringPractice(input: {
  hasActivePhrase: boolean;
  metronomeEnabled: boolean;
}): boolean {
  return input.hasActivePhrase || input.metronomeEnabled;
}
