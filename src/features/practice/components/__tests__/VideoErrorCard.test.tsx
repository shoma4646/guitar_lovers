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

jest.mock("@/features/practice/api/useArchivePracticePhrase", () => ({
  useArchivePracticePhrase: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/useDeletePracticePhrase", () => ({
  useDeletePracticePhrase: () => ({ mutate: jest.fn() }),
}));

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

  describe("二度と再生できない動画（削除・非公開・埋め込み禁止）", () => {
    it.each([100, 101, 150])("練習中のフレーズがありコード %i のとき「このフレーズを整理」でアーカイブ・削除の選択を出す", (code) => {
      startPracticeWithError(code, 0);
      render(<VideoErrorCard code={code} />);

      fireEvent.press(screen.getByRole("button", { name: "このフレーズを整理" }));

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy.mock.calls[0][0]).toBe("イントロ");
      const buttons = alertSpy.mock.calls[0][2] as { text: string }[];
      expect(buttons.map((b) => b.text)).toEqual(["アーカイブ", "削除", "キャンセル"]);
    });

    it("通信エラー（-1）など一時的なエラーでは「このフレーズを整理」も「次の1本へ」も出さない", () => {
      startPracticeWithError(-1, 0);
      render(<VideoErrorCard code={-1} onStartNextPhrase={jest.fn()} />);

      expect(screen.queryByRole("button", { name: "このフレーズを整理" })).toBeNull();
      expect(screen.queryByRole("button", { name: "次の1本へ" })).toBeNull();
    });

    it("練習中のフレーズが無ければ「このフレーズを整理」も「次の1本へ」も出さない", () => {
      usePracticeStore.getState().loadVideo("abc123def45", "動画");
      usePracticeStore.getState().setPlayerError(150);
      render(<VideoErrorCard code={150} onStartNextPhrase={jest.fn()} />);

      expect(screen.queryByRole("button", { name: "このフレーズを整理" })).toBeNull();
      expect(screen.queryByRole("button", { name: "次の1本へ" })).toBeNull();
    });

    it("次の1本があるときだけ「次の1本へ」を出し、押すと次の1本を始める", () => {
      startPracticeWithError(150, 0);
      const onStartNextPhrase = jest.fn();
      render(<VideoErrorCard code={150} onStartNextPhrase={onStartNextPhrase} />);

      fireEvent.press(screen.getByRole("button", { name: "次の1本へ" }));

      expect(onStartNextPhrase).toHaveBeenCalledTimes(1);
    });

    it("次の1本が無ければ「次の1本へ」を出さない", () => {
      startPracticeWithError(150, 0);
      render(<VideoErrorCard code={150} />);

      expect(screen.queryByRole("button", { name: "次の1本へ" })).toBeNull();
    });
  });
});
