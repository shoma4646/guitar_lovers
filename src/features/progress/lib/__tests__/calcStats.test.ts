import { calcStats } from "../calcStats";
import type { PhraseAttempt, PracticeSession } from "@/shared/types/models";

function daysAgoIso(n: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function makeSession(date: string, duration: number): PracticeSession {
  return { id: `${date}-${duration}`, date, duration };
}

function makeAttempt(date: string): PhraseAttempt {
  return { id: `attempt-${date}`, phraseId: "p1", date, bpm: 80, result: "ok" };
}

/** 今日を含めて当週（月曜起点）に収まる経過日数の上限 */
function daysSinceMonday(): number {
  return (new Date().getDay() + 6) % 7;
}

describe("calcStats", () => {
  it("空配列のときは初期値を返す", () => {
    const stats = calcStats([], []);
    expect(stats.totalDuration).toBe(0);
    expect(stats.totalSessions).toBe(0);
    expect(stats.weeklyDuration).toBe(0);
    expect(stats.weeklyPracticeDays).toBe(0);
    expect(stats.streakDays).toBe(0);
    expect(stats.weeklyData).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("累計時間と総回数を集計する", () => {
    const stats = calcStats(
      [makeSession(daysAgoIso(1), 600), makeSession(daysAgoIso(40), 1200)],
      [],
    );
    expect(stats.totalDuration).toBe(1800);
    expect(stats.totalSessions).toBe(2);
  });

  it("当日と前日にセッションがあれば streakDays が 2 になる", () => {
    const stats = calcStats(
      [makeSession(daysAgoIso(0), 60), makeSession(daysAgoIso(1), 60)],
      [],
    );
    expect(stats.streakDays).toBe(2);
  });

  it("当日にセッションが無ければ streakDays は 0", () => {
    const stats = calcStats(
      [makeSession(daysAgoIso(2), 60), makeSession(daysAgoIso(3), 60)],
      [],
    );
    expect(stats.streakDays).toBe(0);
  });

  it("結果記録だけの日も今週の練習日数と連続日数に数える", () => {
    const stats = calcStats([], [makeAttempt(daysAgoIso(0))]);
    expect(stats.weeklyPracticeDays).toBe(1);
    expect(stats.streakDays).toBe(1);
  });

  it("前日のセッションと当日の結果記録で連続日数が繋がる", () => {
    const stats = calcStats(
      [makeSession(daysAgoIso(1), 60)],
      [makeAttempt(daysAgoIso(0))],
    );
    expect(stats.streakDays).toBe(2);
  });

  it("同じ日のセッションと結果記録は1日として数える", () => {
    const stats = calcStats(
      [makeSession(daysAgoIso(0, 9), 60)],
      [makeAttempt(daysAgoIso(0, 21)), makeAttempt(daysAgoIso(0, 22))],
    );
    expect(stats.weeklyPracticeDays).toBe(1);
  });

  it("当週内の異なる日を数える", () => {
    const days = Array.from({ length: daysSinceMonday() + 1 }, (_, i) => i);
    const stats = calcStats([], days.map((n) => makeAttempt(daysAgoIso(n))));
    expect(stats.weeklyPracticeDays).toBe(days.length);
  });

  it("先週以前の練習は今週の練習日数に入らない", () => {
    const lastWeek = daysSinceMonday() + 1;
    const stats = calcStats(
      [makeSession(daysAgoIso(lastWeek), 60)],
      [makeAttempt(daysAgoIso(lastWeek + 1))],
    );
    expect(stats.weeklyPracticeDays).toBe(0);
  });

  it("結果記録は時間と回数の集計に影響しない", () => {
    const stats = calcStats(
      [makeSession(daysAgoIso(0), 300)],
      [makeAttempt(daysAgoIso(0)), makeAttempt(daysAgoIso(1))],
    );
    expect(stats.totalDuration).toBe(300);
    expect(stats.totalSessions).toBe(1);
    expect(stats.weeklyDuration).toBe(300);
  });
});
