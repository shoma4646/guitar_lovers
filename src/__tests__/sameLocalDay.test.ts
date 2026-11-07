import * as fc from "fast-check";
import { diffLocalDays, localDayToDate, toLocalDay } from "@/shared/lib/localDay";
import { computeNextFireAt, isSameLocalDay } from "@/features/reminder/lib/reminderTime";
import { calcStats, toDayKey } from "@/features/progress/lib/calcStats";
import { formatRelativeDay } from "@/features/progress/lib/relativeDay";
import { resolveTodayProgress } from "@/features/practice/lib/progression";
import type { PhraseAttempt } from "@/shared/types/models";

const NUM_RUNS = 1000;

/** 年・月・日がそれぞれ±2以内でずれ、時刻は任意の日時の組（年・月・日の一方だけが一致する組を作るため） */
const nearbyDatePair = fc
  .record({
    base: fc.date({ min: new Date(2000, 0, 1), max: new Date(2099, 11, 31), noInvalidDate: true }),
    yearOffset: fc.integer({ min: -2, max: 2 }),
    monthOffset: fc.integer({ min: -2, max: 2 }),
    dayOffset: fc.integer({ min: -2, max: 2 }),
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.integer({ min: 0, max: 59 }),
    second: fc.integer({ min: 0, max: 59 }),
    ms: fc.integer({ min: 0, max: 999 }),
  })
  .map(({ base, yearOffset, monthOffset, dayOffset, hour, minute, second, ms }) => {
    const other = new Date(
      base.getFullYear() + yearOffset,
      base.getMonth() + monthOffset,
      base.getDate() + dayOffset,
      hour,
      minute,
      second,
      ms,
    );
    return { a: base, b: other };
  });

describe("同じ暦日かの判定が toLocalDay と一致する", () => {
  it("isSameLocalDay", () => {
    fc.assert(
      fc.property(nearbyDatePair, ({ a, b }) => {
        expect(isSameLocalDay(a, b)).toBe(toLocalDay(a) === toLocalDay(b));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("toDayKey", () => {
    fc.assert(
      fc.property(nearbyDatePair, ({ a, b }) => {
        expect(toDayKey(a) === toDayKey(b)).toBe(toLocalDay(a) === toLocalDay(b));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("diffLocalDays", () => {
    fc.assert(
      fc.property(nearbyDatePair, ({ a, b }) => {
        expect(diffLocalDays(a, b) === 0).toBe(toLocalDay(a) === toLocalDay(b));
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("1年前の同じ日付の記録を今日として扱わない", () => {
  const now = localDayToDate("2026-11-06");
  const oneYearAgoEvening = new Date(2025, 10, 6, 20, 0);

  function attempt(date: Date, bpm: number): PhraseAttempt {
    return { id: date.toISOString(), phraseId: "p1", date: date.toISOString(), bpm, result: "ok" };
  }

  it("resolveTodayProgress は1年前のok記録を今日の最高BPMに含めず、目標はその記録から前進させる", () => {
    const progress = resolveTodayProgress(
      { currentBpm: 130, targetBpm: 140, initialBpm: 100 },
      [attempt(oneYearAgoEvening, 130)],
      now,
    );

    expect(progress).toEqual({ targetBeforeToday: 135, todayBestOkBpm: undefined, reached: false });
  });

  it("calcStats は今日と1年前の前日の記録で連続日数を1日と数える", () => {
    const stats = calcStats(
      [],
      [attempt(new Date(2026, 10, 6, 9, 0), 100), attempt(new Date(2025, 10, 5, 20, 0), 100)],
      now,
    );

    expect(stats.streakDays).toBe(1);
  });

  it("formatRelativeDay は1年前の同じ日付を「今日」と表示しない", () => {
    expect(formatRelativeDay(oneYearAgoEvening.toISOString(), now)).not.toBe("今日");
  });

  it("computeNextFireAt は1年前の同じ日付の練習を今日の練習とみなさず、今日のリマインドを返す", () => {
    const fireAt = computeNextFireAt({
      practiceDates: [oneYearAgoEvening.toISOString()],
      override: { hour: 20, minute: 0 },
      now: new Date(2026, 10, 6, 9, 0),
    });

    expect(fireAt).toEqual(new Date(2026, 10, 6, 20, 0));
  });
});
