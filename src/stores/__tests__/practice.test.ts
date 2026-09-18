import { DEFAULT_TARGET_REPS, extractVideoId, usePracticeStore } from "../practice";
import type { PracticePhrase } from "@/shared/types/models";

const initialState = usePracticeStore.getState();

function makePhrase(overrides: Partial<PracticePhrase> = {}): PracticePhrase {
  return {
    id: "p1",
    videoId: "abc123def45",
    videoTitle: "テスト動画",
    name: "フレーズ",
    startSec: 10,
    endSec: 20,
    currentBpm: 80,
    targetBpm: 120,
    playbackRate: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
});

describe("extractVideoId", () => {
  it("youtu.beの短縮URLからIDを抽出する", () => {
    expect(extractVideoId("https://youtu.be/abcdefghijk?si=xxxx")).toBe("abcdefghijk");
  });

  it("watch URLからIDを抽出する", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=abcdefghijk&t=30s")).toBe(
      "abcdefghijk",
    );
  });

  it("vが先頭でないwatch URLからもIDを抽出する", () => {
    expect(
      extractVideoId("https://m.youtube.com/watch?app=desktop&v=abcdefghijk&feature=share"),
    ).toBe("abcdefghijk");
  });

  it("shorts URLからIDを抽出する", () => {
    expect(extractVideoId("https://www.youtube.com/shorts/abcdefghijk")).toBe("abcdefghijk");
  });

  it("live URLからIDを抽出する", () => {
    expect(extractVideoId("https://www.youtube.com/live/abcdefghijk?feature=share")).toBe(
      "abcdefghijk",
    );
  });

  it("生の動画IDをそのまま受け付ける", () => {
    expect(extractVideoId("abcdefghijk")).toBe("abcdefghijk");
  });

  it("不正なURLはnullを返す", () => {
    expect(extractVideoId("https://example.com/not-a-video")).toBeNull();
  });
});

describe("startPhrasePractice", () => {
  it("目標回数を既定値、弾き終えた回数を0にして練習を始める", () => {
    usePracticeStore.getState().startPhrasePractice(makePhrase(), 85);

    const { activePhrasePractice, metronomeBpm } = usePracticeStore.getState();
    expect(activePhrasePractice).toMatchObject({
      todayTargetBpm: 85,
      targetReps: DEFAULT_TARGET_REPS,
      completedReps: 0,
    });
    expect(DEFAULT_TARGET_REPS).toBe(3);
    expect(metronomeBpm).toBe(85);
  });

  it("同じフレーズを開始し直すと弾き終えた回数は0に戻る", () => {
    const { startPhrasePractice, incrementCompletedReps } = usePracticeStore.getState();
    startPhrasePractice(makePhrase(), 85);
    incrementCompletedReps();

    startPhrasePractice(makePhrase(), 85);

    expect(usePracticeStore.getState().activePhrasePractice?.completedReps).toBe(0);
  });
});

describe("incrementCompletedReps", () => {
  it("増やした後の回数を返し、目標回数を超えても数え続ける", () => {
    const { startPhrasePractice, incrementCompletedReps } = usePracticeStore.getState();
    startPhrasePractice(makePhrase(), 85);

    expect([1, 2, 3, 4].map(() => incrementCompletedReps())).toEqual([1, 2, 3, 4]);
    expect(usePracticeStore.getState().activePhrasePractice?.completedReps).toBe(4);
  });

  it("練習中でなければ0を返し状態を変えない", () => {
    expect(usePracticeStore.getState().incrementCompletedReps()).toBe(0);
    expect(usePracticeStore.getState().activePhrasePractice).toBeNull();
  });

  it("別の動画を読み込むと練習中の状態ごと解除される", () => {
    const { startPhrasePractice, incrementCompletedReps, loadVideo } = usePracticeStore.getState();
    startPhrasePractice(makePhrase(), 85);
    incrementCompletedReps();

    loadVideo("zyx987wvu65");

    expect(usePracticeStore.getState().activePhrasePractice).toBeNull();
    expect(usePracticeStore.getState().incrementCompletedReps()).toBe(0);
  });
});

describe("pendingAttemptIdの寿命", () => {
  it("同じフレーズを開始し直しても保存失敗後のpendingAttemptIdは保持される", () => {
    const { startPhrasePractice, beginResultEntry } = usePracticeStore.getState();
    const phrase = makePhrase();
    startPhrasePractice(phrase, 85);
    const pendingId = beginResultEntry("pending-1");

    startPhrasePractice(phrase, 85);

    expect(usePracticeStore.getState().pendingAttemptId).toBe(pendingId);
  });

  it("別のフレーズを開始するとpendingAttemptIdはクリアされる", () => {
    const { startPhrasePractice, beginResultEntry } = usePracticeStore.getState();
    startPhrasePractice(makePhrase({ id: "p1" }), 85);
    beginResultEntry("pending-1");

    startPhrasePractice(makePhrase({ id: "p2" }), 85);

    expect(usePracticeStore.getState().pendingAttemptId).toBeNull();
  });
});
