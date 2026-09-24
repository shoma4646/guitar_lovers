import { describePlayerError } from "../playerError";

describe("describePlayerError", () => {
  it.each([
    [101, "この動画は埋め込み再生が許可されていません"],
    [150, "この動画は埋め込み再生が許可されていません"],
    [100, "動画が見つかりません（削除・非公開の可能性）"],
    [153, "動画の埋め込み設定でエラーが発生しました。アプリを更新してもう一度お試しください"],
    [2, "動画IDが正しくありません。URLを確認してください"],
    [5, "プレイヤーでエラーが発生しました。しばらくしてからやり直してください"],
    [-1, "読み込みに失敗しました。通信状況を確認してください"],
  ])("code %iに対応する案内文を返す", (code, expected) => {
    expect(describePlayerError(code)).toBe(expected);
  });

  it("未知のコードは既定の案内文を返す", () => {
    expect(describePlayerError(999)).toBe(
      "動画を読み込めませんでした。URLと通信状況を確認してください",
    );
  });
});
