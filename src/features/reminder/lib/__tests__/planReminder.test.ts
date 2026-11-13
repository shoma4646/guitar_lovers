import { planReminder } from "../planReminder";
import { DEFAULT_REMINDER_SETTINGS } from "@/shared/lib/schemas/reminderSettings";
import type { PhraseAttempt, PracticePhrase, PracticeSession } from "@/shared/types/models";

const now = new Date(2026, 8, 16, 10);

function makePhrase(id: string): PracticePhrase {
  return {
    id,
    videoId: "abc123def45",
    videoTitle: "テスト動画",
    name: "イントロのリフ",
    startSec: 10,
    endSec: 20,
    currentBpm: 90,
    targetBpm: 120,
    playbackRate: 1,
    createdAt: new Date(2026, 8, 1).toISOString(),
    updatedAt: new Date(2026, 8, 1).toISOString(),
  };
}

describe("planReminder", () => {
  it("設定がOFFならnullを返す", () => {
    expect(
      planReminder({
        phrases: [makePhrase("p1")],
        attempts: [],
        sessions: [],
        settings: { ...DEFAULT_REMINDER_SETTINGS, enabled: false },
        now,
      }),
    ).toBeNull();
  });

  it("対象フレーズが無ければnullを返す", () => {
    expect(
      planReminder({
        phrases: [],
        attempts: [],
        sessions: [],
        settings: { ...DEFAULT_REMINDER_SETTINGS, enabled: true },
        now,
      }),
    ).toBeNull();
  });

  it("フレーズを保存した当日は通知せず翌日に予約する", () => {
    const savedToday: PracticePhrase = {
      ...makePhrase("p1"),
      createdAt: new Date(2026, 8, 16, 9).toISOString(),
      updatedAt: new Date(2026, 8, 16, 9).toISOString(),
    };

    const plan = planReminder({
      phrases: [savedToday],
      attempts: [],
      sessions: [],
      settings: { ...DEFAULT_REMINDER_SETTINGS, enabled: true },
      now,
    });

    expect(plan!.fireAt).toEqual(new Date(2026, 8, 17, 20));
  });

  it("選んだフレーズをdataに入れ、練習セッションの記録も送信日の判定に使う", () => {
    const session: PracticeSession = {
      id: "s1",
      date: new Date(2026, 8, 16, 9).toISOString(),
      duration: 600,
    };

    const plan = planReminder({
      phrases: [makePhrase("p1")],
      attempts: [],
      sessions: [session],
      settings: { ...DEFAULT_REMINDER_SETTINGS, enabled: true },
      now,
    });

    expect(plan).not.toBeNull();
    expect(plan!.data).toEqual({ type: "practice-reminder", phraseId: "p1" });
    expect(plan!.fireAt).toEqual(new Date(2026, 8, 17, 20));
    expect(plan!.body).toContain("『イントロのリフ』");
  });
});

describe("planReminder の手動指定時刻", () => {
  const settings = {
    ...DEFAULT_REMINDER_SETTINGS,
    enabled: true,
    timeOverride: { hour: 21, minute: 30 as const },
  };

  /** 9/2〜9/15の毎日19時台に記録がある（傾向だけなら18時台に送る） */
  function eveningAttempts(): PhraseAttempt[] {
    return Array.from({ length: 14 }, (_, i) => ({
      id: `a${i}`,
      phraseId: "p1",
      date: new Date(2026, 8, 2 + i, 19, 15 + (i % 3) * 10).toISOString(),
      bpm: 92,
      result: "ok" as const,
    }));
  }

  it("過去の記録が19時台に集中していても、今日の21:30に予約する", () => {
    const plan = planReminder({
      phrases: [makePhrase("p1")],
      attempts: eveningAttempts(),
      sessions: [],
      settings,
      now,
    });

    expect(plan!.fireAt).toEqual(new Date(2026, 8, 16, 21, 30));
  });

  it("今日すでに練習済みなら、翌日の21:30に予約する", () => {
    const practicedToday: PhraseAttempt = {
      id: "today",
      phraseId: "p1",
      date: new Date(2026, 8, 16, 8).toISOString(),
      bpm: 92,
      result: "ok",
    };

    const plan = planReminder({
      phrases: [makePhrase("p1")],
      attempts: [...eveningAttempts(), practicedToday],
      sessions: [],
      settings,
      now,
    });

    expect(plan!.fireAt).toEqual(new Date(2026, 8, 17, 21, 30));
  });

  it("21:30を過ぎた後なら、翌日の21:30に予約する", () => {
    const plan = planReminder({
      phrases: [makePhrase("p1")],
      attempts: eveningAttempts(),
      sessions: [],
      settings,
      now: new Date(2026, 8, 16, 21, 45),
    });

    expect(plan!.fireAt).toEqual(new Date(2026, 8, 17, 21, 30));
  });
});
