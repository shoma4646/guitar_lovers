import { render, screen } from "@testing-library/react-native";
import { buildTodayMenu } from "@/features/practice/lib/progression";
import { TodayPickCard } from "@/features/practice/components/TodayPickCard";
import { buildReminderMessage } from "@/features/reminder/lib/reminderMessage";
import { startPhrasePracticeFromReminder } from "@/features/reminder/components/ReminderBridge";
import { usePracticeStore } from "@/stores/practice";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

const NOW = new Date(2026, 8, 24, 12, 0);

const mockPhrase: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "テスト動画",
  name: "イントロのリフ",
  startSec: 10,
  endSec: 20,
  initialBpm: 100,
  currentBpm: 100,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: new Date(2026, 8, 1, 12).toISOString(),
  updatedAt: new Date(2026, 8, 1, 12).toISOString(),
};

// 前日にメトロノームを下げて ok@90、今日すでに ok@100 を記録済み
const mockAttempts: PhraseAttempt[] = [
  { id: "y", phraseId: "p1", date: new Date(2026, 8, 23, 20).toISOString(), bpm: 90, result: "ok" },
  { id: "t", phraseId: "p1", date: new Date(2026, 8, 24, 9).toISOString(), bpm: 100, result: "ok" },
];

jest.mock("@/shared/services/storage", () => ({
  getPracticePhrases: jest.fn(async () => [mockPhrase]),
  getPhraseAttempts: jest.fn(async () => mockAttempts),
}));
jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: [mockPhrase], isLoading: false }),
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: mockAttempts, isLoading: false }),
}));
jest.mock("expo-notifications", () => ({}));
jest.mock("expo-router", () => ({ useRouter: () => ({ navigate: jest.fn() }) }));
jest.mock("@/features/reminder/services/reminderScheduler", () => ({ syncReminder: jest.fn() }));
jest.mock("@/features/reminder/services/reminderSyncSubscription", () => ({
  subscribeReminderSync: jest.fn(),
}));

describe("今日の目標BPMはどの導線でも同じ値になる", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("今日の1本カード・メニューの行・通知タップの開始BPM・通知文面がすべて100", async () => {
    const menuTarget = buildTodayMenu([mockPhrase], mockAttempts, NOW)[0].today.targetBeforeToday;

    render(<TodayPickCard onStartPhrase={jest.fn()} onTryPreset={jest.fn()} onOpenAddVideo={jest.fn()} />);
    const cardShowsTarget = screen.queryByText(`${menuTarget} BPM`) !== null;

    await startPhrasePracticeFromReminder("p1");
    const tapStartBpm = usePracticeStore.getState().activePhrasePractice?.goalBpm;

    const { body } = buildReminderMessage({ phrase: mockPhrase, phraseAttempts: mockAttempts, fireAt: NOW });
    const messageBpm = Number(/今日は(\d+)/.exec(body)?.[1]);

    expect(menuTarget).toBe(100);
    expect(cardShowsTarget).toBe(true);
    expect(tapStartBpm).toBe(100);
    expect(messageBpm).toBe(100);
  });
});
