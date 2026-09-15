import { summarizePhraseProgress } from "../phraseProgress";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

function makePhrase(overrides: Partial<PracticePhrase> = {}): PracticePhrase {
  return {
    id: "p1",
    videoId: "vid",
    videoTitle: "曲",
    name: "速弾きフレーズ1",
    startSec: 10,
    endSec: 20,
    currentBpm: 90,
    targetBpm: 110,
    playbackRate: 1.0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-05T00:00:00.000Z",
    ...overrides,
  };
}

function makeAttempt(overrides: Partial<PhraseAttempt> = {}): PhraseAttempt {
  return {
    id: "a1",
    phraseId: "p1",
    date: "2026-08-01T00:00:00.000Z",
    bpm: 70,
    result: "ok",
    ...overrides,
  };
}

describe("summarizePhraseProgress", () => {
  it("練習結果が無ければ現在BPMを開始BPMとして扱い、達成率は0になる", () => {
    const phrase = makePhrase({ currentBpm: 70, targetBpm: 110 });
    const result = summarizePhraseProgress(phrase, []);
    expect(result.startBpm).toBe(70);
    expect(result.progressRatio).toBe(0);
  });

  it("最初の練習結果のBPMを開始BPMとして使う", () => {
    const phrase = makePhrase({ currentBpm: 90, targetBpm: 110 });
    const attempts = [
      makeAttempt({ id: "a1", date: "2026-08-01T00:00:00.000Z", bpm: 70 }),
      makeAttempt({ id: "a2", date: "2026-08-03T00:00:00.000Z", bpm: 80 }),
    ];
    const result = summarizePhraseProgress(phrase, attempts);
    expect(result.startBpm).toBe(70);
  });

  it("配列の順序に依存せず日時で最初の記録を判定する", () => {
    const phrase = makePhrase({ currentBpm: 90, targetBpm: 110 });
    const attempts = [
      makeAttempt({ id: "a2", date: "2026-08-03T00:00:00.000Z", bpm: 80 }),
      makeAttempt({ id: "a1", date: "2026-08-01T00:00:00.000Z", bpm: 70 }),
    ];
    const result = summarizePhraseProgress(phrase, attempts);
    expect(result.startBpm).toBe(70);
  });

  it("開始と目標の中間なら達成率が0と1の間になる", () => {
    const phrase = makePhrase({ currentBpm: 90, targetBpm: 110 });
    const attempts = [makeAttempt({ bpm: 70 })];
    const result = summarizePhraseProgress(phrase, attempts);
    // (90-70)/(110-70) = 0.5
    expect(result.progressRatio).toBeCloseTo(0.5);
  });

  it("現在BPMが目標を超えていても達成率は1でクランプされる", () => {
    const phrase = makePhrase({ currentBpm: 120, targetBpm: 110 });
    const attempts = [makeAttempt({ bpm: 70 })];
    const result = summarizePhraseProgress(phrase, attempts);
    expect(result.progressRatio).toBe(1);
  });

  it("目標BPMが開始BPM以下でも0除算せず、達成済みなら1を返す", () => {
    const phrase = makePhrase({ currentBpm: 90, targetBpm: 70 });
    const attempts = [makeAttempt({ bpm: 70 })];
    const result = summarizePhraseProgress(phrase, attempts);
    expect(result.progressRatio).toBe(1);
  });

  it("initialBpmがあれば最初の練習結果より優先して開始BPMにする", () => {
    const phrase = makePhrase({ initialBpm: 60, currentBpm: 90, targetBpm: 110 });
    const attempts = [makeAttempt({ bpm: 75 })];
    const result = summarizePhraseProgress(phrase, attempts);
    expect(result.startBpm).toBe(60);
    expect(result.gainBpm).toBe(30);
  });

  it("上昇幅は現在BPMから開始BPMを引いた値になる", () => {
    const phrase = makePhrase({ currentBpm: 90, targetBpm: 110 });
    const attempts = [makeAttempt({ bpm: 70 })];
    expect(summarizePhraseProgress(phrase, attempts).gainBpm).toBe(20);
  });

  it("最初の練習結果が現在BPMより速くても上昇幅は負にならない", () => {
    const phrase = makePhrase({ currentBpm: 70, targetBpm: 110 });
    const attempts = [makeAttempt({ bpm: 90, result: "ng" })];
    expect(summarizePhraseProgress(phrase, attempts).gainBpm).toBe(0);
  });

  it("未卒業ならgraduatedAtはundefined", () => {
    const phrase = makePhrase({ currentBpm: 90, targetBpm: 110 });
    expect(summarizePhraseProgress(phrase, []).graduatedAt).toBeUndefined();
  });

  it("目標BPMに到達していればgraduatedAtに到達日時が入る", () => {
    const phrase = makePhrase({ currentBpm: 90, targetBpm: 110 });
    const attempts = [makeAttempt({ bpm: 110, date: "2026-08-07T00:00:00.000Z" })];
    expect(summarizePhraseProgress(phrase, attempts).graduatedAt).toBe(
      "2026-08-07T00:00:00.000Z",
    );
  });

  it("目標BPMが開始BPM以下で未達成なら0を返す", () => {
    const phrase = makePhrase({ currentBpm: 60, targetBpm: 70 });
    const attempts = [makeAttempt({ bpm: 70, result: "ng" })];
    const result = summarizePhraseProgress(phrase, attempts);
    expect(result.progressRatio).toBe(0);
  });
});
