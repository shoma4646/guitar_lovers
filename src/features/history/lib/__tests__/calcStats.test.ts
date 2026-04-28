import { calcStats } from "../calcStats";
import type { PracticeSession } from "@/shared/types/models";

function daysAgoIso(n: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function makeSession(date: string, duration: number): PracticeSession {
  return { id: `${date}-${duration}`, date, duration };
}

describe("calcStats", () => {
  it("空配列のときは初期値を返す", () => {
    const stats = calcStats([]);
    expect(stats.totalDuration).toBe(0);
    expect(stats.totalSessions).toBe(0);
    expect(stats.weeklyDuration).toBe(0);
    expect(stats.streakDays).toBe(0);
    expect(stats.weeklyData).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("累計時間と総回数を集計する", () => {
    const stats = calcStats([
      makeSession(daysAgoIso(1), 600),
      makeSession(daysAgoIso(40), 1200),
    ]);
    expect(stats.totalDuration).toBe(1800);
    expect(stats.totalSessions).toBe(2);
  });

  it("当日と前日にセッションがあれば streakDays が 2 になる", () => {
    const stats = calcStats([
      makeSession(daysAgoIso(0), 60),
      makeSession(daysAgoIso(1), 60),
    ]);
    expect(stats.streakDays).toBe(2);
  });

  it("当日にセッションが無ければ streakDays は 0", () => {
    const stats = calcStats([
      makeSession(daysAgoIso(2), 60),
      makeSession(daysAgoIso(3), 60),
    ]);
    expect(stats.streakDays).toBe(0);
  });
});
