import { formatRelativeDay } from "../relativeDay";

function local(y: number, m: number, d: number, h: number, min = 0): Date {
  return new Date(y, m - 1, d, h, min, 0, 0);
}

describe("formatRelativeDay", () => {
  it("前日23:00の記録を翌日08:00に見ると「昨日」", () => {
    const iso = local(2026, 10, 21, 23).toISOString();
    expect(formatRelativeDay(iso, local(2026, 10, 22, 8))).toBe("昨日");
  });

  it("2暦日前の記録は経過が48時間未満でも M/D", () => {
    const iso = local(2026, 10, 20, 9).toISOString();
    expect(formatRelativeDay(iso, local(2026, 10, 22, 8))).toBe("10/20");
  });

  it("当日0:01の記録は「今日」", () => {
    const iso = local(2026, 10, 22, 0, 1).toISOString();
    expect(formatRelativeDay(iso, local(2026, 10, 22, 23, 59))).toBe("今日");
  });

  it("月またぎの前日も「昨日」", () => {
    const iso = local(2026, 10, 31, 22).toISOString();
    expect(formatRelativeDay(iso, local(2026, 11, 1, 7))).toBe("昨日");
  });
});
