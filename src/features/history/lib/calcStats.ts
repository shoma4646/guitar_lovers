import type { PracticeSession, PracticeStats } from "@/shared/types/models";

/**
 * セッション一覧から週次集計・連続日数・累計を計算する純粋関数。
 * 月曜起点で当週を集計し、当日から連続している練習日数を返す。
 */
export function calcStats(sessions: PracticeSession[]): PracticeStats {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const weeklyData = Array(7).fill(0) as number[];
  let weeklyDuration = 0;

  sessions.forEach((s) => {
    const date = new Date(s.date);
    const diffDays = Math.floor(
      (date.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays >= 0 && diffDays < 7) {
      weeklyData[diffDays] += s.duration;
      weeklyDuration += s.duration;
    }
  });

  const dateSet = new Set(
    sessions.map((s) => {
      const d = new Date(s.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );

  let streakDays = 0;
  const checkDate = new Date(now);
  while (true) {
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    if (dateSet.has(key)) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    weeklyDuration,
    streakDays,
    totalDuration: sessions.reduce((sum, s) => sum + s.duration, 0),
    totalSessions: sessions.length,
    weeklyData,
  };
}
