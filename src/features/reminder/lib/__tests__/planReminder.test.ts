import { planReminder } from "../planReminder";
import { DEFAULT_REMINDER_SETTINGS } from "@/shared/lib/schemas/reminderSettings";
import type { PracticePhrase, PracticeSession } from "@/shared/types/models";

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
        settings: DEFAULT_REMINDER_SETTINGS,
        now,
      }),
    ).toBeNull();
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
      settings: DEFAULT_REMINDER_SETTINGS,
      now,
    });

    expect(plan).not.toBeNull();
    expect(plan!.data).toEqual({ type: "practice-reminder", phraseId: "p1" });
    expect(plan!.fireAt).toEqual(new Date(2026, 8, 17, 20));
    expect(plan!.body).toContain("『イントロのリフ』");
  });
});
