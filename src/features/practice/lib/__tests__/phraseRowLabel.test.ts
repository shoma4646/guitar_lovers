import type { TodayMenuEntry } from "@/features/practice/lib/progression";
import type { PracticePhrase } from "@/shared/types/models";
import { buildPhraseRowLabel } from "../phraseRowLabel";

const phrase: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "動画",
  name: "イントロ",
  startSec: 0,
  endSec: 10,
  currentBpm: 100,
  targetBpm: 140,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

function entry(
  overrides: Partial<Omit<TodayMenuEntry, "today">> & { today?: Partial<TodayMenuEntry["today"]> },
): TodayMenuEntry {
  return {
    phrase,
    latest: undefined,
    priority: "stale",
    ...overrides,
    today: { targetBeforeToday: 117, todayBestOkBpm: undefined, reached: false, ...overrides.today },
  };
}

describe("buildPhraseRowLabel", () => {
  it("未完了の行は前回BPMと今日の目標BPMを含む", () => {
    expect(buildPhraseRowLabel(entry({}), 112)).toBe("イントロ、前回112、今日の目標117BPM");
  });

  it("今日完了の行は「今日完了」と今日のBPMを含む", () => {
    const label = buildPhraseRowLabel(entry({ today: { todayBestOkBpm: 120, reached: true } }), 120);
    expect(label).toContain("今日完了120BPM");
  });

  it("目標に届かなかった当日の記録は「今日完了」にしない", () => {
    const label = buildPhraseRowLabel(entry({ today: { todayBestOkBpm: 110, reached: false } }), 112);
    expect(label).not.toContain("今日完了");
  });

  it("卒業済みの行は先頭に「卒業済み」が付く", () => {
    expect(buildPhraseRowLabel(entry({ priority: "graduated" }), 140)).toMatch(/^卒業済み、イントロ/);
  });
});
