import * as fc from "fast-check";
import {
  clampReminderTime,
  computeNextFireAt,
  formatReminderTime,
  resolveReminderTime,
  shiftReminderTime,
} from "../reminderTime";

/** 2026年9月のローカル時刻をISO文字列にする（実行環境のタイムゾーンに依存させない） */
function sep(day: number, hour: number, minute = 0): string {
  return new Date(2026, 8, day, hour, minute).toISOString();
}

function sepDate(day: number, hour = 0, minute = 0): Date {
  return new Date(2026, 8, day, hour, minute);
}

const now = sepDate(16, 10);
const tomorrow = sepDate(17);

describe("resolveReminderTime", () => {
  it("記録が無ければ20:00を返す", () => {
    expect(resolveReminderTime({ practiceDates: [], targetDay: tomorrow, now })).toEqual({
      hour: 20,
      minute: 0,
    });
  });

  it("同じ曜日の記録が2件以上あれば、その曜日の中央値の30分前にする", () => {
    const practiceDates = [sep(10, 21, 10), sep(3, 21, 50), sep(15, 8)];

    expect(resolveReminderTime({ practiceDates, targetDay: tomorrow, now })).toEqual({
      hour: 21,
      minute: 0,
    });
  });

  it("同じ曜日の記録が1件なら全曜日の中央値を使う", () => {
    const practiceDates = [sep(10, 21, 10), sep(15, 19), sep(14, 19, 20)];

    expect(resolveReminderTime({ practiceDates, targetDay: tomorrow, now })).toEqual({
      hour: 18,
      minute: 45,
    });
  });

  it("28日より古い記録は使わない", () => {
    const practiceDates = [sep(10, 21, 10), sep(3, 21, 50)].map((iso) => {
      const date = new Date(iso);
      date.setMonth(date.getMonth() - 1);
      return date.toISOString();
    });

    expect(resolveReminderTime({ practiceDates, targetDay: tomorrow, now })).toEqual({
      hour: 20,
      minute: 0,
    });
  });

  it("15分単位で切り捨てる", () => {
    const practiceDates = [sep(14, 19, 44), sep(15, 19, 44)];

    expect(resolveReminderTime({ practiceDates, targetDay: tomorrow, now })).toEqual({
      hour: 19,
      minute: 0,
    });
  });

  it("早朝の傾向は07:00に収める", () => {
    const practiceDates = [sep(14, 6), sep(15, 6, 10)];

    expect(resolveReminderTime({ practiceDates, targetDay: tomorrow, now })).toEqual({
      hour: 7,
      minute: 0,
    });
  });

  it("深夜の傾向は22:00に収める", () => {
    const practiceDates = [sep(14, 23, 50), sep(15, 23, 40)];

    expect(resolveReminderTime({ practiceDates, targetDay: tomorrow, now })).toEqual({
      hour: 22,
      minute: 0,
    });
  });

  it("0時をまたぐ記録（23:50と0:20）は22:00にする", () => {
    const practiceDates = [sep(14, 23, 50), sep(15, 0, 20)];

    expect(resolveReminderTime({ practiceDates, targetDay: tomorrow, now })).toEqual({
      hour: 22,
      minute: 0,
    });
  });

  it("記録の大半が0:10前後でも07:00ではなく22:00にする", () => {
    const practiceDates = [sep(13, 0, 10), sep(14, 0, 5), sep(15, 0, 15)];

    expect(resolveReminderTime({ practiceDates, targetDay: tomorrow, now })).toEqual({
      hour: 22,
      minute: 0,
    });
  });

  it("0〜4時の記録は前日の曜日に入れる", () => {
    const monday = sepDate(21);
    const practiceDates = [sep(15, 0, 30), sep(8, 0, 30), sep(16, 19), sep(17, 19)];
    const params = { practiceDates, now: sepDate(21, 6) };

    expect(resolveReminderTime({ ...params, targetDay: monday })).toEqual({ hour: 22, minute: 0 });
    expect(resolveReminderTime({ ...params, targetDay: sepDate(22) })).toEqual({
      hour: 21,
      minute: 15,
    });
  });

  it("4時以降の記録は当日の朝として扱う", () => {
    const practiceDates = [sep(14, 4), sep(15, 4, 10)];

    expect(resolveReminderTime({ practiceDates, targetDay: tomorrow, now })).toEqual({
      hour: 7,
      minute: 0,
    });
  });
});

describe("resolveReminderTime の性質", () => {
  /** 9月1〜15日のいずれかの日の、startMinutes から spanMinutes 未満だけ後の記録日時 */
  const sampleFrom = (startMinutes: number, spanMinutes: number) =>
    fc
      .tuple(fc.integer({ min: 1, max: 15 }), fc.integer({ min: 0, max: spanMinutes - 1 }))
      .map(([day, offset]) => new Date(2026, 8, day, 0, startMinutes + offset).toISOString());
  const anySample = sampleFrom(0, 24 * 60);
  const targetDayArb = fc.integer({ min: 16, max: 22 }).map((day) => sepDate(day));

  it("22:30〜翌4:00の記録だけなら、必ず22:00になる", () => {
    fc.assert(
      fc.property(
        fc.array(sampleFrom(22 * 60 + 30, 330), { minLength: 2, maxLength: 20 }),
        targetDayArb,
        (practiceDates, targetDay) => {
          const time = resolveReminderTime({ practiceDates, targetDay, now });
          return time.hour === 22 && time.minute === 0;
        },
      ),
    );
  });

  it("21:00〜翌2:00の記録だけなら、昼や朝にならず20:30〜22:00になる", () => {
    fc.assert(
      fc.property(
        fc.array(sampleFrom(21 * 60, 300), { minLength: 2, maxLength: 20 }),
        targetDayArb,
        (practiceDates, targetDay) => {
          const { hour, minute } = resolveReminderTime({ practiceDates, targetDay, now });
          const minutes = hour * 60 + minute;
          return minutes >= 20 * 60 + 30 && minutes <= 22 * 60;
        },
      ),
    );
  });

  it("どんな入力でも07:00〜22:00の範囲で15分刻みになる", () => {
    fc.assert(
      fc.property(fc.array(anySample, { maxLength: 20 }), targetDayArb, (practiceDates, targetDay) => {
        const { hour, minute } = resolveReminderTime({ practiceDates, targetDay, now });
        const minutes = hour * 60 + minute;
        return minutes >= 7 * 60 && minutes <= 22 * 60 && minute % 15 === 0;
      }),
    );
  });

  it("入力の並び順を入れ替えても結果は変わらない", () => {
    fc.assert(
      fc.property(
        fc.array(anySample, { maxLength: 20 }).chain((dates) =>
          fc.tuple(fc.constant(dates), fc.shuffledSubarray(dates, { minLength: dates.length })),
        ),
        targetDayArb,
        ([practiceDates, shuffled], targetDay) => {
          expect(resolveReminderTime({ practiceDates: shuffled, targetDay, now })).toEqual(
            resolveReminderTime({ practiceDates, targetDay, now }),
          );
        },
      ),
    );
  });
});

describe("computeNextFireAt", () => {
  it("今日まだ練習しておらず時刻前なら今日にする", () => {
    expect(computeNextFireAt({ practiceDates: [], override: null, now })).toEqual(
      sepDate(16, 20),
    );
  });

  it("今日すでに練習していれば明日にする", () => {
    const practiceDates = [sep(16, 8)];

    expect(computeNextFireAt({ practiceDates, override: null, now })).toEqual(
      sepDate(17, 20),
    );
  });

  it("今日の時刻を過ぎていれば明日にする", () => {
    expect(
      computeNextFireAt({ practiceDates: [], override: null, now: sepDate(16, 21) }),
    ).toEqual(sepDate(17, 20));
  });

  it("手動の時刻を傾向より優先する", () => {
    const practiceDates = [sep(10, 21, 10), sep(3, 21, 50), sep(9, 21, 10), sep(2, 21, 50)];

    expect(
      computeNextFireAt({
        practiceDates,
        override: { hour: 7, minute: 30 },
        now: sepDate(16, 6),
      }),
    ).toEqual(sepDate(16, 7, 30));
  });

  it("送る日の曜日の傾向で時刻を決める", () => {
    const practiceDates = [sep(10, 21, 10), sep(3, 21, 50), sep(9, 8), sep(2, 8)];

    expect(
      computeNextFireAt({ practiceDates, override: null, now: sepDate(16, 22, 30) }),
    ).toEqual(sepDate(17, 21));
  });
});

describe("shiftReminderTime", () => {
  it("指定の分だけずらす", () => {
    expect(shiftReminderTime({ hour: 21, minute: 30 }, 30)).toEqual({ hour: 22, minute: 0 });
  });

  it("上限(22:00)を超えたら22:00で止まる", () => {
    expect(shiftReminderTime({ hour: 22, minute: 0 }, 30)).toEqual({ hour: 22, minute: 0 });
  });

  it("下限(07:00)を下回ったら07:00で止まる", () => {
    expect(shiftReminderTime({ hour: 7, minute: 0 }, -30)).toEqual({ hour: 7, minute: 0 });
  });

  it("上限・下限の範囲外から呼ばれても07:00〜22:00に収める", () => {
    expect(shiftReminderTime({ hour: 0, minute: 0 }, -30)).toEqual({ hour: 7, minute: 0 });
  });
});

describe("clampReminderTime", () => {
  it("範囲内ならそのまま返す", () => {
    expect(clampReminderTime({ hour: 12, minute: 30 })).toEqual({ hour: 12, minute: 30 });
  });

  it("07:00より前は07:00にする", () => {
    expect(clampReminderTime({ hour: 3, minute: 0 })).toEqual({ hour: 7, minute: 0 });
  });

  it("22:00より後は22:00にする", () => {
    expect(clampReminderTime({ hour: 23, minute: 30 })).toEqual({ hour: 22, minute: 0 });
  });
});

describe("formatReminderTime", () => {
  it("分を2桁で表示する", () => {
    expect(formatReminderTime({ hour: 7, minute: 0 })).toBe("7:00");
    expect(formatReminderTime({ hour: 21, minute: 45 })).toBe("21:45");
  });
});
