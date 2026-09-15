import { buildReminderMessage, pickReminderPhrase } from "../reminderMessage";
import {
  computeTodayTargetBpm,
  getLatestAttempt,
  resolveCurrentBpm,
} from "@/features/practice/lib/progression";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

function sep(day: number, hour: number, minute = 0): string {
  return new Date(2026, 8, day, hour, minute).toISOString();
}

function makePhrase(overrides: Partial<PracticePhrase> = {}): PracticePhrase {
  return {
    id: "p1",
    videoId: "abc123def45",
    videoTitle: "テスト動画",
    name: "イントロのリフ",
    startSec: 10,
    endSec: 20,
    currentBpm: 90,
    targetBpm: 120,
    playbackRate: 1,
    createdAt: sep(1, 12),
    updatedAt: sep(1, 12),
    ...overrides,
  };
}

function makeAttempt(overrides: Partial<PhraseAttempt> = {}): PhraseAttempt {
  return {
    id: "a1",
    phraseId: "p1",
    date: sep(16, 20),
    bpm: 92,
    result: "ok",
    ...overrides,
  };
}

describe("pickReminderPhrase", () => {
  it("フレーズが無ければnullを返す", () => {
    expect(pickReminderPhrase([], [])).toBeNull();
  });

  it("アーカイブ済みは記録が新しくても選ばない", () => {
    const archived = makePhrase({ id: "old", archivedAt: sep(15, 9) });
    const active = makePhrase({ id: "active" });
    const attempts = [makeAttempt({ phraseId: "old", date: sep(15, 8) })];

    expect(pickReminderPhrase([archived, active], attempts)?.id).toBe("active");
  });

  it("最後に記録を付けたフレーズを選ぶ", () => {
    const phrases = [
      makePhrase({ id: "a" }),
      makePhrase({ id: "b" }),
      makePhrase({ id: "new", createdAt: sep(16, 9) }),
    ];
    const attempts = [
      makeAttempt({ id: "1", phraseId: "a", date: sep(10, 20) }),
      makeAttempt({ id: "2", phraseId: "b", date: sep(15, 20) }),
    ];

    expect(pickReminderPhrase(phrases, attempts)?.id).toBe("b");
  });

  it("どれにも記録が無ければ最後に作成したフレーズを選ぶ", () => {
    const phrases = [
      makePhrase({ id: "a", createdAt: sep(10, 9) }),
      makePhrase({ id: "b", createdAt: sep(12, 9) }),
    ];

    expect(pickReminderPhrase(phrases, [])?.id).toBe("b");
  });
});

describe("buildReminderMessage", () => {
  const fireAt = new Date(2026, 8, 17, 19);

  it("記録が無ければ保存済みのBPMから始める文面にする", () => {
    const { title, body } = buildReminderMessage({
      phrase: makePhrase(),
      phraseAttempts: [],
      fireAt,
    });

    expect(title).toBe("今日の練習");
    expect(body).toBe("『イントロのリフ』を保存しました。今日は90から始めましょう");
  });

  it("届く日の前日に弾けていれば「昨日」と書く", () => {
    const { body } = buildReminderMessage({
      phrase: makePhrase(),
      phraseAttempts: [makeAttempt()],
      fireAt,
    });

    expect(body).toBe("『イントロのリフ』を昨日92で弾けました。今日は97に挑戦");
  });

  it("2日以上前なら「前回」と書く", () => {
    const { body } = buildReminderMessage({
      phrase: makePhrase(),
      phraseAttempts: [makeAttempt({ date: sep(15, 23, 59) })],
      fireAt,
    });

    expect(body).toBe("『イントロのリフ』は前回92で弾けました。今日は97に挑戦");
  });

  it("前日の0時過ぎの記録も「昨日」と判定する", () => {
    const { body } = buildReminderMessage({
      phrase: makePhrase(),
      phraseAttempts: [makeAttempt({ date: sep(16, 0, 1) })],
      fireAt: new Date(2026, 8, 17, 7),
    });

    expect(body).toContain("を昨日92で");
  });

  it("目標BPMに届いて据え置きなら仕上げの文面にする", () => {
    const { body } = buildReminderMessage({
      phrase: makePhrase({ currentBpm: 120 }),
      phraseAttempts: [makeAttempt({ bpm: 120 })],
      fireAt,
    });

    expect(body).toBe("『イントロのリフ』は目標の120に届いています。今日も120で仕上げ");
  });

  it("あやしい・弾けなかった記録なら前回のBPMと据え置きの目標を書く", () => {
    const { body } = buildReminderMessage({
      phrase: makePhrase(),
      phraseAttempts: [makeAttempt({ bpm: 100, result: "partial" })],
      fireAt,
    });

    expect(body).toBe("『イントロのリフ』、前回は100で練習しました。今日は90から");
  });

  it("長いフレーズ名は20文字で切る", () => {
    const { body } = buildReminderMessage({
      phrase: makePhrase({ name: "あ".repeat(25) }),
      phraseAttempts: [],
      fireAt,
    });

    expect(body).toContain(`『${"あ".repeat(20)}…』`);
  });

  it("目標BPMは今日の練習メニューと同じ計算で求める", () => {
    const phrase = makePhrase({ currentBpm: 80 });
    const attempts = [
      makeAttempt({ id: "1", date: sep(14, 20), bpm: 85, result: "ok" }),
      makeAttempt({ id: "2", date: sep(16, 20), bpm: 85, result: "ok" }),
    ];
    const expected = computeTodayTargetBpm(
      resolveCurrentBpm(phrase.currentBpm, attempts),
      getLatestAttempt(attempts),
      phrase.targetBpm,
    );

    const { body } = buildReminderMessage({ phrase, phraseAttempts: attempts, fireAt });

    expect(body).toContain(`今日は${expected}に挑戦`);
  });
});
