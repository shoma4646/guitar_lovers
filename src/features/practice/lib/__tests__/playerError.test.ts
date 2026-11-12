import { describePlayerError, isPermanentPlayerError } from "../playerError";

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

describe("isPermanentPlayerError", () => {
  it.each([100, 101, 150])("削除・非公開・埋め込み禁止（%i）は読み込み直しても再生できないエラーとみなす", (code) => {
    expect(isPermanentPlayerError(code)).toBe(true);
  });

  it.each([-1, 2, 5, 153, 999])("それ以外（%i）は恒久的なエラーとみなさない", (code) => {
    expect(isPermanentPlayerError(code)).toBe(false);
  });
});
