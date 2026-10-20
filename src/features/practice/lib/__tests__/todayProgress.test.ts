import * as fc from "fast-check";
import { resolveCurrentBpm, resolveTodayProgress } from "../progression";
import { BPM_MAX } from "@/shared/constants/bpm";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

type Phrase = Pick<PracticePhrase, "currentBpm" | "targetBpm" | "initialBpm">;

/** 2026年9月の指定日時を、実行環境のローカル時刻として表すDate */
function septemberLocal(day: number, hour: number, minute = 0): Date {
  return new Date(2026, 8, day, hour, minute);
}

/** septemberLocalのISO文字列（PhraseAttempt.dateの保存形式） */
function septemberLocalIso(day: number, hour: number, minute = 0): string {
  return septemberLocal(day, hour, minute).toISOString();
}

function attempt(overrides: Partial<PhraseAttempt> = {}): PhraseAttempt {
  return {
    id: "attempt",
    phraseId: "phrase-1",
    date: septemberLocalIso(24, 10),
    bpm: 90,
    result: "ok",
    ...overrides,
  };
}

describe("resolveTodayProgress", () => {
  it("記録が無いフレーズは、保存済みのcurrentBpmを目標として達成判定する", () => {
    const phrase: Phrase = { currentBpm: 90, targetBpm: 120 };
    const now = septemberLocal(24, 12);
    const today = attempt({ date: septemberLocalIso(24, 10), result: "ok", bpm: 90 });

    const progress = resolveTodayProgress(phrase, [today], now);

    expect(progress.targetBeforeToday).toBe(90);
    expect(progress.todayBestOkBpm).toBe(90);
    expect(progress.reached).toBe(true);
  });

  it("今日okでも目標BPM未満なら未達成", () => {
    const phrase: Phrase = { currentBpm: 90, targetBpm: 120 };
    const now = septemberLocal(24, 12);
    const today = attempt({ date: septemberLocalIso(24, 10), result: "ok", bpm: 85 });

    expect(resolveTodayProgress(phrase, [today], now).reached).toBe(false);
  });

  it.each([["partial"], ["ng"]] as const)(
    "今日の記録が%sだけなら未達成（bpmが高くても達成にしない）",
    (result) => {
      const phrase: Phrase = { currentBpm: 90, targetBpm: 120 };
      const now = septemberLocal(24, 12);
      const today = attempt({ date: septemberLocalIso(24, 10), result, bpm: 150 });

      const progress = resolveTodayProgress(phrase, [today], now);
      expect(progress.todayBestOkBpm).toBeUndefined();
      expect(progress.reached).toBe(false);
    },
  );

  it("前日までの記録から目標を前進させ、今日その目標に達すれば達成", () => {
    const phrase: Phrase = { currentBpm: 80, targetBpm: 120 };
    const now = septemberLocal(24, 12);
    const yesterday = attempt({
      id: "yesterday",
      date: septemberLocalIso(23, 10),
      result: "ok",
      bpm: 85,
    });
    const today = attempt({ id: "today", date: septemberLocalIso(24, 10), result: "ok", bpm: 90 });

    const progress = resolveTodayProgress(phrase, [yesterday, today], now);

    // 前日85で成功しているので、今日の目標は85+5=90に前進している
    expect(progress.targetBeforeToday).toBe(90);
    expect(progress.reached).toBe(true);
  });

  it("今日ok達成後にさらに練習しても、目標も達成表示も後退しない", () => {
    const phrase: Phrase = { currentBpm: 80, targetBpm: 120 };
    const now = septemberLocal(24, 12);
    const yesterday = attempt({
      id: "yesterday",
      date: septemberLocalIso(23, 10),
      result: "ok",
      bpm: 85,
    });
    const firstToday = attempt({
      id: "first-today",
      date: septemberLocalIso(24, 10),
      result: "ok",
      bpm: 90,
    });

    const afterFirstSuccess = resolveTodayProgress(phrase, [yesterday, firstToday], now);
    expect(afterFirstSuccess.targetBeforeToday).toBe(90);
    expect(afterFirstSuccess.reached).toBe(true);

    // 同日中にさらに成功しても、今日の記録は除外されるため目標(90)は変わらない
    const laterOkAttempt = attempt({
      id: "later-ok",
      date: septemberLocalIso(24, 10, 30),
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
      date: septemberLocalIso(24, 11),
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

  it("initialBpmを持たない既存データでも、今日の結果は目標に混入しない", () => {
    // 前日までの到達は80。今日83でokした結果、storageがcurrentBpmを83へ更新した状態
    const phrase: Phrase = { currentBpm: 83, targetBpm: 120 };
    const now = septemberLocal(24, 12);
    const yesterday = attempt({ id: "y", date: septemberLocalIso(23, 10), result: "ok", bpm: 80 });
    const today = attempt({ id: "t", date: septemberLocalIso(24, 10), result: "ok", bpm: 83 });

    const progress = resolveTodayProgress(phrase, [yesterday, today], now);

    // 目標は80+5=85のままで、83では達成にしない
    expect(progress.targetBeforeToday).toBe(85);
    expect(progress.reached).toBe(false);
  });

  it("記録が1件も無いフレーズは保存時のBPMがそのまま今日の目標になる", () => {
    const phrase: Phrase = { currentBpm: 90, targetBpm: 120 };
    const now = septemberLocal(24, 12);

    expect(resolveTodayProgress(phrase, [], now)).toEqual({
      targetBeforeToday: 90,
      todayBestOkBpm: undefined,
      reached: false,
    });
  });

  it("卒業済みのフレーズでは目標BPMを超えて前進しない", () => {
    const phrase: Phrase = { currentBpm: 120, targetBpm: 120 };
    const now = septemberLocal(24, 12);
    const yesterday = attempt({ id: "y", date: septemberLocalIso(23, 10), result: "ok", bpm: 120 });

    const progress = resolveTodayProgress(phrase, [yesterday], now);

    expect(progress.targetBeforeToday).toBe(120);
  });

  it("1時間しか離れていなくても、端末のローカル日付が前日の記録は「当日」に含めない", () => {
    const phrase: Phrase = { currentBpm: 90, targetBpm: 120 };
    const now = septemberLocal(25, 0, 30);
    const notToday = attempt({ date: septemberLocalIso(24, 23, 30), result: "ok", bpm: 90 });

    const progress = resolveTodayProgress(phrase, [notToday], now);

    expect(progress.todayBestOkBpm).toBeUndefined();
    expect(progress.reached).toBe(false);
  });

  it("20時間以上離れていても、端末のローカル日付が同じ記録は「当日」に含める", () => {
    const phrase: Phrase = { currentBpm: 90, targetBpm: 120 };
    const now = septemberLocal(24, 23, 30);
    const today = attempt({ date: septemberLocalIso(24, 0, 30), result: "ok", bpm: 90 });

    const progress = resolveTodayProgress(phrase, [today], now);

    expect(progress.todayBestOkBpm).toBe(90);
    expect(progress.reached).toBe(true);
  });

  it("当日のok記録でphrase.currentBpmが既に書き換わっていても、当日開始前の目標はinitialBpmから再構築する", () => {
    // 前日までの到達80（initialBpm70から前日okで到達）・今日の目標85のとき、
    // 今日83でokしてphrase.currentBpmが83に更新されていても、目標は85のまま・未達成
    const phrase: Phrase = { currentBpm: 83, targetBpm: 120, initialBpm: 70 };
    const now = septemberLocal(24, 12);
    const yesterday = attempt({
      id: "yesterday",
      date: septemberLocalIso(23, 10),
      result: "ok",
      bpm: 80,
    });
    const today = attempt({ id: "today", date: septemberLocalIso(24, 10), result: "ok", bpm: 83 });

    const progress = resolveTodayProgress(phrase, [yesterday, today], now);

    expect(progress.targetBeforeToday).toBe(85);
    expect(progress.todayBestOkBpm).toBe(83);
    expect(progress.reached).toBe(false);
  });
});

describe("resolveTodayProgress: 到達BPMより遅いテンポで弾けた記録", () => {
  it("initialBpm 100・前日 ok@90 なら、今日の目標は到達BPMの100（下がらない）", () => {
    const phrase: Phrase = { currentBpm: 100, targetBpm: 120, initialBpm: 100 };
    const yesterday = attempt({ id: "y", date: septemberLocalIso(23, 20), result: "ok", bpm: 90 });

    expect(resolveTodayProgress(phrase, [yesterday], septemberLocal(24, 12)).targetBeforeToday).toBe(100);
  });

  it("その日に ok@95 で弾いても目標100には未達成", () => {
    const phrase: Phrase = { currentBpm: 100, targetBpm: 120, initialBpm: 100 };
    const yesterday = attempt({ id: "y", date: septemberLocalIso(23, 20), result: "ok", bpm: 90 });
    const today = attempt({ id: "t", date: septemberLocalIso(24, 10), result: "ok", bpm: 95 });

    expect(resolveTodayProgress(phrase, [yesterday, today], septemberLocal(24, 12)).reached).toBe(false);
  });
});

describe("resolveTodayProgress の性質", () => {
  const bpm = fc.integer({ min: 40, max: BPM_MAX });
  const recordArb = fc.record({
    day: fc.integer({ min: 1, max: 24 }),
    hour: fc.integer({ min: 0, max: 23 }),
    bpm,
    result: fc.constantFrom<PhraseAttempt["result"]>("ok", "partial", "ng"),
  });
  const caseArb = fc.record({
    initialBpm: bpm,
    targetBpm: bpm,
    records: fc.array(recordArb, { maxLength: 12 }),
    todayRecords: fc.array(recordArb.map((r) => ({ ...r, day: 24 })), { maxLength: 4 }),
  });
  const now = septemberLocal(24, 23, 59);
  const toAttempts = (records: { day: number; hour: number; bpm: number; result: PhraseAttempt["result"] }[], prefix: string) =>
    records.map((r, i) =>
      attempt({ id: `${prefix}${i}`, date: septemberLocalIso(r.day, r.hour), bpm: r.bpm, result: r.result }),
    );

  it("今日の目標は当日前の到達BPM以上・到達BPM+5以下で、当日の記録を足しても変わらない", () => {
    fc.assert(
      fc.property(caseArb, ({ initialBpm, targetBpm, records, todayRecords }) => {
        const before = toAttempts(records, "b").filter((a) => new Date(a.date).getDate() !== 24);
        const today = toAttempts(todayRecords, "t");
        const phrase: Phrase = { currentBpm: initialBpm, targetBpm, initialBpm };
        const reachedBefore = resolveCurrentBpm(initialBpm, before);
        const cap = Math.min(BPM_MAX, Math.max(targetBpm, reachedBefore));

        const withoutToday = resolveTodayProgress(phrase, before, now).targetBeforeToday;
        const withToday = resolveTodayProgress(phrase, [...before, ...today], now).targetBeforeToday;

        expect(withoutToday).toBeGreaterThanOrEqual(Math.min(reachedBefore, cap));
        expect(withoutToday).toBeLessThanOrEqual(reachedBefore + 5);
        expect(withToday).toBe(withoutToday);
      }),
    );
  });
});
