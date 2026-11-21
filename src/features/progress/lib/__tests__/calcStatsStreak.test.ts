import * as fc from "fast-check";
import { calcStats } from "../calcStats";
import type { PracticeSession } from "@/shared/types/models";

function session(date: Date): PracticeSession {
  return { id: date.toISOString(), date: date.toISOString(), duration: 60 };
}

describe("calcStats の連続日数", () => {
  it.each([
    [
      "Europe/Berlin の夏時間が始まる日（23時間）",
      new Date(2026, 2, 29, 21, 0),
      new Date(2026, 2, 30, 0, 30),
    ],
    [
      "America/New_York の夏時間が始まる日（23時間）",
      new Date(2026, 2, 8, 21, 0),
      new Date(2026, 2, 9, 0, 30),
    ],
  ])(
    "%s をまたいでも前日の練習で連続日数が繋がる",
    (_label, previousDay, now) => {
      const stats = calcStats(
        [
          session(previousDay),
          session(
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 10),
          ),
        ],
        [],
        now,
      );
      expect(stats.streakDays).toBe(2);
    },
  );

  it.each([
    [
      "Europe/Berlin の冬時間に戻る日（25時間）",
      new Date(2026, 9, 24, 21, 0),
      new Date(2026, 9, 25, 23, 30),
    ],
    [
      "America/New_York の冬時間に戻る日（25時間）",
      new Date(2026, 9, 31, 21, 0),
      new Date(2026, 10, 1, 23, 30),
    ],
  ])("%s に同じ日を2回数えない", (_label, previousDay, now) => {
    const stats = calcStats(
      [
        session(previousDay),
        session(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0),
        ),
      ],
      [],
      now,
    );
    expect(stats.streakDays).toBe(2);
  });

  it("今日から遡って、記録のある暦日が途切れるまでの日数と一致する", () => {
    const anyDate = fc.date({
      min: new Date(2000, 0, 1),
      max: new Date(2099, 11, 31),
      noInvalidDate: true,
    });
    // 一様な日付だけでは夏時間の切り替えを遡る例がほぼ生成されないため、切り替え日の直後も混ぜる
    const dateAfterDstSwitch = fc
      .record({
        switchDay: fc.constantFrom(
          new Date(2026, 2, 8),
          new Date(2026, 2, 29),
          new Date(2026, 9, 25),
          new Date(2026, 10, 1),
        ),
        daysAfter: fc.integer({ min: 0, max: 20 }),
        minute: fc.integer({ min: 0, max: 24 * 60 - 1 }),
      })
      .map(
        ({ switchDay, daysAfter, minute }) =>
          new Date(
            switchDay.getFullYear(),
            switchDay.getMonth(),
            switchDay.getDate() + daysAfter,
            Math.floor(minute / 60),
            minute % 60,
          ),
      );
    const minuteOfDay = fc.integer({ min: 0, max: 24 * 60 - 1 });

    fc.assert(
      fc.property(
        fc.oneof(anyDate, dateAfterDstSwitch),
        fc.integer({ min: 0, max: 21 }).chain((streak) =>
          fc.record({
            streak: fc.constant(streak),
            records: fc.tuple(
              fc.array(fc.array(minuteOfDay, { minLength: 1, maxLength: 3 }), {
                minLength: streak,
                maxLength: streak,
              }),
              fc.array(
                fc.record({
                  dayOffset: fc.integer({ min: streak + 1, max: streak + 10 }),
                  minute: minuteOfDay,
                }),
                { maxLength: 10 },
              ),
            ),
          }),
        ),
        (now, { streak, records: [streakMinutes, olderRecords] }) => {
          const atOffset = (dayOffset: number, minute: number) =>
            new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - dayOffset,
              Math.floor(minute / 60),
              minute % 60,
            );
          const dates = [
            ...streakMinutes.flatMap((minutes, dayOffset) =>
              minutes.map((m) => atOffset(dayOffset, m)),
            ),
            ...olderRecords.map((r) => atOffset(r.dayOffset, r.minute)),
          ];
          expect(calcStats(dates.map(session), [], now).streakDays).toBe(
            streak,
          );
        },
      ),
    );
  });
});
