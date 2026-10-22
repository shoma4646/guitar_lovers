import { fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Alert } from "react-native";
import { usePracticeStore } from "@/stores/practice";
import type { PracticePhrase } from "@/shared/types/models";
import { VideoErrorCard } from "../VideoErrorCard";

const phrase: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "動画",
  name: "イントロ",
  startSec: 10,
  endSec: 20,
  currentBpm: 80,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const initialState = usePracticeStore.getState();

describe("VideoErrorCard", () => {
  let alertSpy: jest.SpyInstance;
  let announceSpy: jest.SpyInstance;

  beforeEach(() => {
    usePracticeStore.setState(initialState, true);
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    announceSpy = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function startPracticeWithError(code: number, reps: number) {
    usePracticeStore.getState().startPhrasePractice(phrase, 85);
    for (let i = 0; i < reps; i += 1) usePracticeStore.getState().incrementCompletedReps();
    usePracticeStore.getState().setPlayerError(code);
  }

  it("通信エラー（-1）では「もう一度読み込む」で練習中の状態を保ったまま読み込み直す", () => {
    startPracticeWithError(-1, 2);
    const nonce = usePracticeStore.getState().videoLoadNonce;
    render(<VideoErrorCard code={-1} />);

    fireEvent.press(screen.getByRole("button", { name: "もう一度読み込む" }));

    const state = usePracticeStore.getState();
    expect(state.videoLoadNonce).toBe(nonce + 1);
    expect(state.playerError).toBeNull();
    expect(state.activePhrasePractice?.completedReps).toBe(2);
  });

  it("通信エラー以外では「もう一度読み込む」を出さない", () => {
    startPracticeWithError(150, 0);
    render(<VideoErrorCard code={150} />);

    expect(screen.queryByRole("button", { name: "もう一度読み込む" })).toBeNull();
  });

  it("弾いた回数があるとき戻るボタンを押すと、確認を出してから閉じる", () => {
    startPracticeWithError(-1, 2);
    render(<VideoErrorCard code={-1} />);

    fireEvent.press(screen.getByRole("button", { name: "今日のメニューに戻る" }));

    expect(alertSpy).toHaveBeenCalledWith("練習中の記録が消えます", expect.any(String), expect.any(Array));
    expect(usePracticeStore.getState().loadedVideoId).toBe(phrase.videoId);
  });

  it("練習中のフレーズが無ければ戻るボタンは「別の動画を読み込む」で、確認なしで閉じる", () => {
    usePracticeStore.getState().loadVideo("abc123def45", "動画");
    usePracticeStore.getState().setPlayerError(100);
    render(<VideoErrorCard code={100} />);

    fireEvent.press(screen.getByRole("button", { name: "別の動画を読み込む" }));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(usePracticeStore.getState().loadedVideoId).toBeNull();
  });

  it("エラー内容はalertとして表示し、読み上げで通知する", () => {
    startPracticeWithError(-1, 0);
    render(<VideoErrorCard code={-1} />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(announceSpy).toHaveBeenCalledWith(
      expect.stringContaining("読み込みに失敗しました。通信状況を確認してください"),
    );
  });
});
