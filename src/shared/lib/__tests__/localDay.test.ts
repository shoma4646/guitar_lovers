import { localDayToDate, msUntilNextLocalMidnight, toLocalDay } from "../localDay";

describe("localDay", () => {
  it("端末ローカルの暦日を YYYY-MM-DD で返す", () => {
    expect(toLocalDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(toLocalDay(new Date(2026, 0, 6, 0, 0))).toBe("2026-01-06");
  });

  it("暦日から戻した Date は同じ暦日になる", () => {
    expect(toLocalDay(localDayToDate("2026-10-23"))).toBe("2026-10-23");
  });

  it("次のローカル0:00までのミリ秒を返す", () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 22, 23, 59, 0))).toBe(60_000);
  });
});
