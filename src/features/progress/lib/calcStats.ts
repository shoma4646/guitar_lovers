import type {
  PhraseAttempt,
  PracticeSession,
  PracticeStats,
} from "@/shared/types/models";
import { diffLocalDays } from "@/shared/lib/localDay";

/** 端末ローカルの暦日を表すキーを返す（同じ暦日なら同じ値） */
export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * セッションとフレーズ練習結果から週次集計・練習日数・累計を計算する純粋関数。
 * `now` の暦日を今日として、月曜起点で当週を集計する。練習日（今週の練習日数・連続日数・weeklyPracticedDays）は
 * セッションと結果記録のどちらかがあった日を数え、時間と回数はセッションのみから集計する。
 */
export function calcStats(
  sessions: PracticeSession[],
  attempts: PhraseAttempt[],
  now: Date,
): PracticeStats {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  const weeklyData = Array(7).fill(0) as number[];
  let weeklyDuration = 0;

  sessions.forEach((s) => {
    const date = new Date(s.date);
    const diffDays = diffLocalDays(monday, date);
    if (diffDays >= 0 && diffDays < 7) {
      weeklyData[diffDays] += s.duration;
      weeklyDuration += s.duration;
    }
  });

  const practiceDates = [...sessions, ...attempts].map((item) => new Date(item.date));
  const dateSet = new Set(practiceDates.map(toDayKey));

  const weeklyPracticeDays = new Set(
    practiceDates.filter((d) => d >= monday && d < nextMonday).map(toDayKey),
  ).size;

  const weeklyPracticedDays = Array(7).fill(false) as boolean[];
  practiceDates.forEach((date) => {
    const diffDays = diffLocalDays(monday, date);
    if (diffDays >= 0 && diffDays < 7) {
      weeklyPracticedDays[diffDays] = true;
    }
  });

  let streakDays = 0;
  const checkDate = new Date(now);
  while (dateSet.has(toDayKey(checkDate))) {
    streakDays++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return {
    weeklyDuration,
    weeklyPracticeDays,
    streakDays,
    totalDuration: sessions.reduce((sum, s) => sum + s.duration, 0),
    totalSessions: sessions.length,
    weeklyData,
    weeklyPracticedDays,
  };
}
