import * as fc from "fast-check";
import { calcStats } from "../calcStats";
import type { PracticeSession } from "@/shared/types/models";

function session(date: Date, duration: number): PracticeSession {
  return { id: date.toISOString(), date: date.toISOString(), duration };
}

describe("calcStats の週の振り分け", () => {
  it.each([
    ["Europe/Berlin の冬時間に戻る日", new Date(2026, 9, 25, 23, 30)],
    ["America/New_York の冬時間に戻る日", new Date(2026, 10, 1, 23, 30)],
  ])("%s（日曜）23:30 の練習を週の7日目に数える", (_label, practicedAt) => {
    const now = new Date(practicedAt.getFullYear(), practicedAt.getMonth(), practicedAt.getDate(), 23, 59);
    const stats = calcStats([session(practicedAt, 600)], [], now);
    expect(stats.weeklyPracticeDays).toBe(1);
    expect(stats.weeklyPracticedDays).toEqual([false, false, false, false, false, false, true]);
    expect(stats.weeklyData[6]).toBe(600);
    expect(stats.weeklyDuration).toBe(600);
  });

  it("週内の任意の記録について、丸の数が練習日数と一致し、丸の位置が記録の曜日（月曜起点）と一致する", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(2000, 0, 1), max: new Date(2099, 11, 31), noInvalidDate: true }),
        fc.array(
          fc.record({
            dayOffset: fc.integer({ min: 0, max: 6 }),
            minute: fc.integer({ min: 0, max: 24 * 60 - 1 }),
          }),
          { maxLength: 10 },
        ),
        (now, records) => {
          const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
          const dates = records.map(
            (r) =>
              new Date(
                monday.getFullYear(),
                monday.getMonth(),
                monday.getDate() + r.dayOffset,
                Math.floor(r.minute / 60),
                r.minute % 60,
              ),
          );
          const stats = calcStats(
            dates.map((d) => session(d, 60)),
            [],
            now,
          );
          const marked = stats.weeklyPracticedDays.filter(Boolean).length;
          expect(marked).toBe(stats.weeklyPracticeDays);
          const expectedPositions = new Set(dates.map((d) => (d.getDay() + 6) % 7));
          stats.weeklyPracticedDays.forEach((v, i) => {
            expect(v).toBe(expectedPositions.has(i));
          });
          expect(stats.weeklyDuration).toBe(dates.length * 60);
        },
      ),
    );
  });
});
