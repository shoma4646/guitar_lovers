/**
 * YouTube IFrame APIのエラーコードから、ユーザー向けの案内文を返す
 * PracticeTabの動画エラー表示とAddVideoSheetの両方から参照する
 * @param code - YouTube IFrame Player APIが返すエラーコード
 */
export function describePlayerError(code: number): string {
  switch (code) {
    case 101:
    case 150:
      return "この動画は埋め込み再生が許可されていません";
    case 100:
      return "動画が見つかりません（削除・非公開の可能性）";
    case 153:
      return "動画の埋め込み設定でエラーが発生しました。アプリを更新してもう一度お試しください";
    case 2:
      return "動画IDが正しくありません。URLを確認してください";
    case 5:
      return "プレイヤーでエラーが発生しました。しばらくしてからやり直してください";
    case -1:
      return "読み込みに失敗しました。通信状況を確認してください";
    default:
      return "動画を読み込めませんでした。URLと通信状況を確認してください";
  }
}
