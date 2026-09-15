import {
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

  it("日をまたいだら0:00側へ巻き戻す", () => {
    expect(shiftReminderTime({ hour: 23, minute: 45 }, 30)).toEqual({ hour: 0, minute: 15 });
  });

  it("0:00より前へ戻したら23時台にする", () => {
    expect(shiftReminderTime({ hour: 0, minute: 0 }, -30)).toEqual({ hour: 23, minute: 30 });
  });
});

describe("formatReminderTime", () => {
  it("分を2桁で表示する", () => {
    expect(formatReminderTime({ hour: 7, minute: 0 })).toBe("7:00");
    expect(formatReminderTime({ hour: 21, minute: 45 })).toBe("21:45");
  });
});
