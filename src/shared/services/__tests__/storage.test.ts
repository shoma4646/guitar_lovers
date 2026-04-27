import AsyncStorage from "@react-native-async-storage/async-storage";
import { calculateStats, savePracticeSession } from "../storage";
import type { PracticeSession } from "@/shared/types/models";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest"),
);

/** 指定日からn日前のISO日付文字列を作る */
function daysAgoIso(n: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function makeSession(date: string, duration: number): PracticeSession {
  return { id: `${date}-${duration}`, date, duration };
}

describe("calculateStats", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("セッションが空のときは初期値を返す", async () => {
    const stats = await calculateStats();
    expect(stats).toEqual({
      weeklyDuration: 0,
      streakDays: 0,
      totalDuration: 0,
      totalSessions: 0,
      weeklyData: [0, 0, 0, 0, 0, 0, 0],
    });
  });

  it("累計時間と総回数を全セッションから集計する", async () => {
    await savePracticeSession(makeSession(daysAgoIso(1), 600));
    await savePracticeSession(makeSession(daysAgoIso(40), 1200));

    const stats = await calculateStats();
    expect(stats.totalDuration).toBe(1800);
    expect(stats.totalSessions).toBe(2);
  });

  it("今週分のみ weeklyDuration に集計する", async () => {
    // 40日前のセッションは今週には含まれない
    await savePracticeSession(makeSession(daysAgoIso(40), 9999));
    await savePracticeSession(makeSession(daysAgoIso(0), 100));

    const stats = await calculateStats();
    expect(stats.weeklyDuration).toBe(100);
  });

  it("当日と前日にセッションがあれば streakDays は 2 になる", async () => {
    await savePracticeSession(makeSession(daysAgoIso(0), 60));
    await savePracticeSession(makeSession(daysAgoIso(1), 60));

    const stats = await calculateStats();
    expect(stats.streakDays).toBe(2);
  });

  it("当日にセッションが無ければ streakDays は 0 になる", async () => {
    await savePracticeSession(makeSession(daysAgoIso(2), 60));
    await savePracticeSession(makeSession(daysAgoIso(3), 60));

    const stats = await calculateStats();
    expect(stats.streakDays).toBe(0);
  });
});
