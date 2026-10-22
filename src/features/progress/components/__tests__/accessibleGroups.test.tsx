import { render, screen } from "@testing-library/react-native";
import { ProgressBar } from "@/shared/components/atoms/ProgressBar";
import type { PracticePhrase } from "@/shared/types/models";
import type { PhraseProgressSummary } from "@/features/progress/lib/phraseProgress";
import { PhraseProgressList } from "../PhraseProgressList";
import { WeekBarChart } from "../WeekBarChart";

const phrase = {
  id: "p1",
  videoId: "v1",
  videoTitle: "動画",
  name: "速弾き",
  startSec: 0,
  endSec: 10,
  currentBpm: 75,
  targetBpm: 90,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
} as PracticePhrase;

describe("表示のみのまとまりを1つのアクセシビリティ要素として扱う", () => {
  it("ProgressBarはラベルと値を持つ1つのprogressbarになる", () => {
    render(<ProgressBar ratio={0.5} accessibilityLabel="達成率" />);
    const bar = screen.getByRole("progressbar", { name: "達成率" });
    expect(bar.props.accessibilityValue).toEqual({ now: 50, min: 0, max: 100 });
  });

  it("フレーズ進捗行はフレーズ名と数値をまとめた1要素として読まれる", () => {
    const summary = {
      phrase,
      startBpm: 60,
      currentBpm: 75,
      targetBpm: 90,
      progressRatio: 0.5,
    } as PhraseProgressSummary;
    render(<PhraseProgressList items={[summary]} />);
    const row = screen.getByLabelText("速弾き、開始60から目標90のうち現在75");
    expect(row.props.accessible).toBe(true);
  });

  it("週の練習日数のバーは1枚の画像として読まれる", () => {
    render(<WeekBarChart weeklyPracticedDays={[true, false, false, false, false, false, false]} />);
    expect(screen.getByRole("image").props.accessible).toBe(true);
  });
});
