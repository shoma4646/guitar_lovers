import { parsePhraseDraft } from "../parsePhraseDraft";

const valid = { name: "速弾きフレーズ1", currentBpm: "80", targetBpm: "100" };

describe("parsePhraseDraft", () => {
  it("正常な入力なら名前を前後の空白を除いて数値化した値を返す", () => {
    expect(parsePhraseDraft({ ...valid, name: "  速弾き  " })).toEqual({
      ok: true,
      value: { name: "速弾き", currentBpm: 80, targetBpm: 100 },
    });
  });

  it("名前が空ならエラー", () => {
    expect(parsePhraseDraft({ ...valid, name: "" })).toEqual({
      ok: false,
      error: "フレーズの名前を入力してください",
    });
  });

  it("名前が空白だけならエラー", () => {
    expect(parsePhraseDraft({ ...valid, name: "   " })).toEqual({
      ok: false,
      error: "フレーズの名前を入力してください",
    });
  });

  it.each(["39", "241", "", "abc"])("現在BPMが範囲外(%s)ならエラー", (currentBpm) => {
    expect(parsePhraseDraft({ ...valid, currentBpm, targetBpm: "240" })).toEqual({
      ok: false,
      error: "現在のBPMは40〜240の範囲で入力してください",
    });
  });

  it.each(["39", "241", ""])("目標BPMが範囲外(%s)ならエラー", (targetBpm) => {
    expect(parsePhraseDraft({ ...valid, currentBpm: "40", targetBpm })).toEqual({
      ok: false,
      error: "目標BPMは40〜240の範囲で入力してください",
    });
  });

  it("境界値40と240は受け付ける", () => {
    expect(parsePhraseDraft({ ...valid, currentBpm: "40", targetBpm: "240" })).toEqual({
      ok: true,
      value: { name: valid.name, currentBpm: 40, targetBpm: 240 },
    });
  });

  it.each([
    ["100", "100"],
    ["100", "90"],
  ])("目標BPMが現在BPM以下(現在%s・目標%s)ならエラー", (currentBpm, targetBpm) => {
    expect(parsePhraseDraft({ ...valid, currentBpm, targetBpm })).toEqual({
      ok: false,
      error: "目標BPMは現在のBPMより大きい値にしてください",
    });
  });
});
