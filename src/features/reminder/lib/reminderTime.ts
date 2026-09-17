import type { ReminderTime } from "@/shared/lib/schemas/reminderSettings";

/** 傾向の算出に使う直近の日数 */
const LOOKBACK_DAYS = 28;
/** 傾向として採用する最小の記録件数 */
const MIN_SAMPLES = 2;
/** 記録が足りないときの送信時刻（分） */
const DEFAULT_MINUTES = 20 * 60;
/** 記録時刻は練習の終わりなので、その分だけ前に送る（分） */
const LEAD_MINUTES = 30;
const ROUND_MINUTES = 15;
const EARLIEST_MINUTES = 7 * 60;
const LATEST_MINUTES = 22 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

function toReminderTime(minutes: number): ReminderTime {
  return {
    hour: Math.floor(minutes / 60),
    minute: (minutes % 60) as ReminderTime["minute"],
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : Math.floor((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * 2つの日時がローカル時刻で同じ日か
 * @param a - 比較する日時
 * @param b - 比較する日時
 */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * 練習記録の時刻の傾向から、指定日のリマインド送信時刻を決める
 *
 * 直近28日の記録のうち、指定日と同じ曜日が2件以上あればその曜日だけ、無ければ全曜日の
 * ローカル時刻の中央値を取り、30分前・15分単位切り捨て・07:00〜22:00に収める。
 * 記録が2件未満なら20:00を返す
 * @param params.practiceDates - 練習記録の日時（ISO 8601）
 * @param params.targetDay - 送信する日（時刻は無視する）
 * @param params.now - 現在日時
 */
export function resolveReminderTime({
  practiceDates,
  targetDay,
  now,
}: {
  practiceDates: string[];
  targetDay: Date;
  now: Date;
}): ReminderTime {
  const since = now.getTime() - LOOKBACK_DAYS * DAY_MS;
  const recent = practiceDates
    .map((date) => new Date(date))
    .filter((date) => {
      const time = date.getTime();
      return !Number.isNaN(time) && time >= since && time <= now.getTime();
    });
  const sameWeekday = recent.filter((date) => date.getDay() === targetDay.getDay());
  const samples =
    sameWeekday.length >= MIN_SAMPLES
      ? sameWeekday
      : recent.length >= MIN_SAMPLES
        ? recent
        : [];
  if (samples.length === 0) {
    return toReminderTime(DEFAULT_MINUTES);
  }

  const minutesOfDay = samples.map((date) => date.getHours() * 60 + date.getMinutes());
  const lead = median(minutesOfDay) - LEAD_MINUTES;
  const rounded = Math.floor(lead / ROUND_MINUTES) * ROUND_MINUTES;
  return toReminderTime(Math.min(Math.max(rounded, EARLIEST_MINUTES), LATEST_MINUTES));
}

/**
 * 次にリマインドを送る日時を返す
 *
 * 今日まだ練習記録が無く、今日の送信時刻が未来なら今日。それ以外は明日。
 * 送信時刻は手動指定があればそれを、無ければ送る日ごとの傾向を使う
 * @param params.practiceDates - 練習記録の日時（ISO 8601）
 * @param params.override - 手動で指定した送信時刻（無ければnull）
 * @param params.now - 現在日時
 */
export function computeNextFireAt({
  practiceDates,
  override,
  now,
}: {
  practiceDates: string[];
  override: ReminderTime | null;
  now: Date;
}): Date {
  const fireAtOn = (offsetDays: number): Date => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
    const time = override ?? resolveReminderTime({ practiceDates, targetDay: day, now });
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.hour, time.minute);
  };

  const practicedToday = practiceDates.some((date) => isSameLocalDay(new Date(date), now));
  if (!practicedToday) {
    const today = fireAtOn(0);
    if (today.getTime() > now.getTime()) {
      return today;
    }
  }
  return fireAtOn(1);
}

/**
 * 送信時刻を指定の分だけずらす。日をまたぐ場合は0:00〜23:59の範囲に巻き戻す
 * @param time - 元の時刻
 * @param deltaMinutes - ずらす分（15の倍数）
 */
export function shiftReminderTime(time: ReminderTime, deltaMinutes: number): ReminderTime {
  const minutesPerDay = 24 * 60;
  const total = time.hour * 60 + time.minute + deltaMinutes;
  return toReminderTime(((total % minutesPerDay) + minutesPerDay) % minutesPerDay);
}

/**
 * 送信時刻を「21:30」形式の文字列にする
 * @param time - 表示する時刻
 */
export function formatReminderTime(time: ReminderTime): string {
  return `${time.hour}:${String(time.minute).padStart(2, "0")}`;
}
