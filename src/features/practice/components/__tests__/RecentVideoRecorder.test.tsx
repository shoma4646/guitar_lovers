import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";
import {
  addFavoriteVideo,
  addRecentVideo,
  getRecentVideos,
  savePracticePhrase,
} from "@/shared/services/storage";
import type { PracticePhrase } from "@/shared/types/models";
import { usePracticeStore } from "@/stores/practice";
import { startPhrasePracticeFromReminder } from "@/features/reminder/components/ReminderBridge";
import { RecentVideoRecorder } from "../RecentVideoRecorder";
import { FavoritesTab } from "../FavoritesTab";
import { PresetsTab } from "../PresetsTab";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-notifications", () => ({}));
jest.mock("expo-router", () => ({ useRouter: () => ({ navigate: jest.fn() }) }));
jest.mock("@/features/reminder/services/reminderScheduler", () => ({ syncReminder: jest.fn() }));
jest.mock("@/features/practice/hooks/useConfirmPhraseSwitch", () => ({
  useConfirmPhraseSwitch: () => (proceed: () => void) => proceed(),
}));
jest.mock("../../../../../assets/json/practice_presets.json", () => [
  { id: "preset-1", videoId: "BBz-Jyr23M4", title: "コード練習", category: "chord" },
]);

const TARGET = "abc123def45";
const OTHER = "zyx987wvu65";
const FIVE_DAYS_AGO = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

const phrase: PracticePhrase = {
  id: "p1",
  videoId: TARGET,
  videoTitle: "フレーズの動画",
  name: "イントロのリフ",
  startSec: 10,
  endSec: 20,
  initialBpm: 100,
  currentBpm: 100,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: "2026-09-01T03:00:00.000Z",
  updatedAt: "2026-09-01T03:00:00.000Z",
};

const initialState = usePracticeStore.getState();

function renderWithRecorder(ui?: ReactNode) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RecentVideoRecorder />
      {ui}
    </QueryClientProvider>,
  );
}

async function expectRecentHead(videoId: string, since: number) {
  await waitFor(async () => {
    const [head] = await getRecentVideos();
    expect(head?.videoId).toBe(videoId);
    expect(Date.parse(head.lastWatchedAt)).toBeGreaterThanOrEqual(since);
  });
}

beforeEach(async () => {
  usePracticeStore.setState(initialState, true);
  await AsyncStorage.clear();
  await addRecentVideo({ videoId: TARGET, title: "フレーズの動画", lastWatchedAt: FIVE_DAYS_AGO });
  await addRecentVideo({ videoId: OTHER, title: "別の動画", lastWatchedAt: FIVE_DAYS_AGO });
});

describe("最近見た動画は、どの入口から開いても先頭に来て今日の日時になる", () => {
  it("お気に入りタブの最近見た動画行", async () => {
    const since = Date.now();
    renderWithRecorder(<FavoritesTab />);

    fireEvent.press(await screen.findByRole("button", { name: /^フレーズの動画を再生/ }));

    await expectRecentHead(TARGET, since);
  });

  it("お気に入り行", async () => {
    await addFavoriteVideo({ id: "f1", videoId: "fav00000001", title: "お気に入りの動画", addedAt: FIVE_DAYS_AGO });
    const since = Date.now();
    renderWithRecorder(<FavoritesTab />);

    fireEvent.press(await screen.findByRole("button", { name: /^お気に入りの動画を再生/ }));

    await expectRecentHead("fav00000001", since);
  });

  it("メニュー集の見本動画", async () => {
    const since = Date.now();
    renderWithRecorder(<PresetsTab />);

    fireEvent.press(await screen.findByRole("button", { name: "コード練習を再生" }));

    await expectRecentHead("BBz-Jyr23M4", since);
  });

  it("URL 入力", async () => {
    const since = Date.now();
    renderWithRecorder();

    usePracticeStore.getState().loadVideo(`https://www.youtube.com/watch?v=${TARGET}`, "URLの動画");

    await expectRecentHead(TARGET, since);
  });

  it("今日のフレーズ・進捗タブの今日の1本（フレーズ練習の開始）", async () => {
    const since = Date.now();
    renderWithRecorder();

    usePracticeStore.getState().startPhrasePractice(phrase, 100);

    await expectRecentHead(TARGET, since);
  });

  it("別の動画を読み込み中に、別の動画のフレーズへ切り替えたとき", async () => {
    renderWithRecorder();
    usePracticeStore.getState().loadVideo(OTHER, "別の動画");
    await expectRecentHead(OTHER, 0);
    const since = Date.now();

    usePracticeStore.getState().startPracticeOnLoadedVideo(phrase, 100);

    await expectRecentHead(TARGET, since);
  });

  it("通知タップ", async () => {
    await savePracticePhrase(phrase);
    const since = Date.now();
    renderWithRecorder();

    await startPhrasePracticeFromReminder(phrase.id);

    await expectRecentHead(TARGET, since);
  });
});

describe("同じ動画のまま切り替えたとき", () => {
  it("読み込み済みの同じ動画でフレーズを切り替えても、重複行は増えず記録し直さない", async () => {
    renderWithRecorder();
    usePracticeStore.getState().loadVideo(TARGET, "フレーズの動画");
    usePracticeStore.getState().setDuration(180);
    await expectRecentHead(TARGET, 0);
    const before = await getRecentVideos();

    usePracticeStore.getState().startPhrasePractice(phrase, 100);
    expect(usePracticeStore.getState().videoRetargetNonce).toBe(1);
    usePracticeStore.getState().reloadVideo();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(await getRecentVideos()).toEqual(before);
  });

  it("動画を閉じてから同じ動画を開き直すと、日時が更新される", async () => {
    renderWithRecorder();
    usePracticeStore.getState().loadVideo(TARGET, "フレーズの動画");
    await expectRecentHead(TARGET, 0);
    usePracticeStore.getState().loadVideo(OTHER, "別の動画");
    await expectRecentHead(OTHER, 0);
    usePracticeStore.getState().clearVideo();
    const since = Date.now();

    usePracticeStore.getState().loadVideo(TARGET, "フレーズの動画");

    await expectRecentHead(TARGET, since);
  });
});
