import { resolveTodayProgress } from "../todayCompletion";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

// TZは jest.setup.js で Asia/Tokyo に固定している

type Phrase = Pick<PracticePhrase, "currentBpm" | "targetBpm" | "initialBpm">;

function attempt(overrides: Partial<PhraseAttempt> = {}): PhraseAttempt {
  return {
    id: "attempt",
    phraseId: "phrase-1",
    date: "2026-09-24T10:00:00.000Z",
    bpm: 90,
    result: "ok",
    ...overrides,
  };
}

describe("resolveTodayProgress", () => {
  it("記録が無いフレーズは、保存済みのcurrentBpmを目標として達成判定する", () => {
    const phrase: Phrase = { currentBpm: 90, targetBpm: 120 };
    const now = new Date("2026-09-24T12:00:00.000Z");
    const today = attempt({ date: "2026-09-24T10:00:00.000Z", result: "ok", bpm: 90 });

    const progress = resolveTodayProgress(phrase, [today], now);

    expect(progress.targetBeforeToday).toBe(90);
    expect(progress.todayBestOkBpm).toBe(90);
    expect(progress.reached).toBe(true);
  });

  it("今日okでも目標BPM未満なら未達成", () => {
    const phrase: Phrase = { currentBpm: 90, targetBpm: 120 };
    const now = new Date("2026-09-24T12:00:00.000Z");
    const today = attempt({ date: "2026-09-24T10:00:00.000Z", result: "ok", bpm: 85 });

    expect(resolveTodayProgress(phrase, [today], now).reached).toBe(false);
  });

  it.each([["partial"], ["ng"]] as const)(
    "今日の記録が%sだけなら未達成（bpmが高くても達成にしない）",
    (result) => {
      const phrase: Phrase = { currentBpm: 90, targetBpm: 120 };
      const now = new Date("2026-09-24T12:00:00.000Z");
      const today = attempt({ date: "2026-09-24T10:00:00.000Z", result, bpm: 150 });

      const progress = resolveTodayProgress(phrase, [today], now);
      expect(progress.todayBestOkBpm).toBeUndefined();
      expect(progress.reached).toBe(false);
    },
  );

  it("前日までの記録から目標を前進させ、今日その目標に達すれば達成", () => {
    const phrase: Phrase = { currentBpm: 80, targetBpm: 120 };
    const now = new Date("2026-09-24T12:00:00.000Z");
    const yesterday = attempt({
      id: "yesterday",
      date: "2026-09-23T10:00:00.000Z",
      result: "ok",
      bpm: 85,
    });
    const today = attempt({ id: "today", date: "2026-09-24T10:00:00.000Z", result: "ok", bpm: 90 });

    const progress = resolveTodayProgress(phrase, [yesterday, today], now);

    // 前日85で成功しているので、今日の目標は85+5=90に前進している
    expect(progress.targetBeforeToday).toBe(90);
    expect(progress.reached).toBe(true);
  });

  it("今日ok達成後にさらに練習しても、目標も達成表示も後退しない", () => {
    const phrase: Phrase = { currentBpm: 80, targetBpm: 120 };
    const now = new Date("2026-09-24T12:00:00.000Z");
    const yesterday = attempt({
      id: "yesterday",
      date: "2026-09-23T10:00:00.000Z",
      result: "ok",
      bpm: 85,
    });
    const firstToday = attempt({
      id: "first-today",
      date: "2026-09-24T10:00:00.000Z",
      result: "ok",
      bpm: 90,
    });

    const afterFirstSuccess = resolveTodayProgress(phrase, [yesterday, firstToday], now);
    expect(afterFirstSuccess.targetBeforeToday).toBe(90);
    expect(afterFirstSuccess.reached).toBe(true);

    // 同日中にさらに成功しても、今日の記録は除外されるため目標(90)は変わらない
    const laterOkAttempt = attempt({
      id: "later-ok",
      date: "2026-09-24T10:30:00.000Z",
      result: "ok",
      bpm: 95,
    });
    const afterAnotherSuccess = resolveTodayProgress(
      phrase,
      [yesterday, firstToday, laterOkAttempt],
      now,
    );
    expect(afterAnotherSuccess.targetBeforeToday).toBe(90);
    expect(afterAnotherSuccess.reached).toBe(true);
    expect(afterAnotherSuccess.todayBestOkBpm).toBe(95);

    // 同日中に失敗のリトライを重ねても、達成表示は後退しない
    const laterNgAttempt = attempt({
      id: "later-ng",
      date: "2026-09-24T11:00:00.000Z",
      result: "ng",
      bpm: 70,
    });
    const afterRetryFailure = resolveTodayProgress(
      phrase,
      [yesterday, firstToday, laterOkAttempt, laterNgAttempt],
      now,
    );
    expect(afterRetryFailure.targetBeforeToday).toBe(90);
    expect(afterRetryFailure.reached).toBe(true);
  });

  // now=18:00Z(JST 9/25 03:00) と対象記録=10:00Z(JST 9/24 19:00) はUTCでは同日だがJSTでは別日
  it("initialBpmを持たない既存データでも、今日の結果は目標に混入しない", () => {
    // 前日までの到達は80。今日83でokした結果、storageがcurrentBpmを83へ更新した状態
    const phrase: Phrase = { currentBpm: 83, targetBpm: 120 };
    const now = new Date("2026-09-24T12:00:00.000Z");
    const yesterday = attempt({ id: "y", date: "2026-09-23T10:00:00.000Z", result: "ok", bpm: 80 });
    const today = attempt({ id: "t", date: "2026-09-24T10:00:00.000Z", result: "ok", bpm: 83 });

    const progress = resolveTodayProgress(phrase, [yesterday, today], now);

    // 目標は80+5=85のままで、83では達成にしない
    expect(progress.targetBeforeToday).toBe(85);
    expect(progress.reached).toBe(false);
  });

  it("UTCでは同日でもJSTでは別日になる記録は「当日」に含めない", () => {
    const phrase: Phrase = { currentBpm: 90, targetBpm: 120 };
    const now = new Date("2026-09-24T18:00:00.000Z");
    const notToday = attempt({ date: "2026-09-24T10:00:00.000Z", result: "ok", bpm: 90 });

    const progress = resolveTodayProgress(phrase, [notToday], now);

    // JSTでは前日の記録として扱われるため、今日の達成にはならない
    expect(progress.todayBestOkBpm).toBeUndefined();
    expect(progress.reached).toBe(false);
  });

  // now=01:00Z(JST 9/24 10:00) と対象記録=前日20:00Z(JST 9/24 05:00) はUTCでは別日だがJSTでは同日
  it("UTCでは別日でもJSTでは同日になる記録は「当日」に含める", () => {
    const phrase: Phrase = { currentBpm: 90, targetBpm: 120 };
    const now = new Date("2026-09-24T01:00:00.000Z");
    const today = attempt({ date: "2026-09-23T20:00:00.000Z", result: "ok", bpm: 90 });

    const progress = resolveTodayProgress(phrase, [today], now);

    expect(progress.todayBestOkBpm).toBe(90);
    expect(progress.reached).toBe(true);
  });

  it("当日のok記録でphrase.currentBpmが既に書き換わっていても、当日開始前の目標はinitialBpmから再構築する", () => {
    // 前日までの到達80（initialBpm70から前日okで到達）・今日の目標85のとき、
    // 今日83でokしてphrase.currentBpmが83に更新されていても、目標は85のまま・未達成
    const phrase: Phrase = { currentBpm: 83, targetBpm: 120, initialBpm: 70 };
    const now = new Date("2026-09-24T12:00:00.000Z");
    const yesterday = attempt({
      id: "yesterday",
      date: "2026-09-23T10:00:00.000Z",
      result: "ok",
      bpm: 80,
    });
    const today = attempt({ id: "today", date: "2026-09-24T10:00:00.000Z", result: "ok", bpm: 83 });

    const progress = resolveTodayProgress(phrase, [yesterday, today], now);

    expect(progress.targetBeforeToday).toBe(85);
    expect(progress.todayBestOkBpm).toBe(83);
    expect(progress.reached).toBe(false);
  });
});
