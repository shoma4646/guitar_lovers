import { formatRelativeVideoDate } from "../relativeVideoDate";

describe("formatRelativeVideoDate", () => {
  const morning = new Date(2026, 9, 27, 8, 0);

  it("前日23:00に開いた動画を翌朝8:00に見ると「昨日」", () => {
    expect(formatRelativeVideoDate(new Date(2026, 9, 26, 23, 0).toISOString(), morning)).toBe("昨日");
  });

  it("2日前23:00に開いた動画を朝8:00に見ると「2日前」", () => {
    expect(formatRelativeVideoDate(new Date(2026, 9, 25, 23, 0).toISOString(), morning)).toBe("2日前");
  });

  it("同じ日の0:01なら「今日」", () => {
    expect(formatRelativeVideoDate(new Date(2026, 9, 27, 0, 1).toISOString(), morning)).toBe("今日");
  });

  it("週・月の単位は暦日の差で決める", () => {
    expect(formatRelativeVideoDate(new Date(2026, 9, 20, 23, 0).toISOString(), morning)).toBe("1週前");
    expect(formatRelativeVideoDate(new Date(2026, 8, 27, 9, 0).toISOString(), morning)).toBe("1ヶ月前");
  });

  it("未来の日時は「今日」", () => {
    expect(formatRelativeVideoDate(new Date(2026, 9, 28, 8, 0).toISOString(), morning)).toBe("今日");
  });

  it("解釈できない日時では NaN を含まない空文字を返す", () => {
    expect(formatRelativeVideoDate("not-a-date", morning)).toBe("");
    expect(formatRelativeVideoDate("", morning)).toBe("");
  });
});
