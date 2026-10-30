import * as fc from "fast-check";
import { filterOpenMenuEntries, planAfterResult } from "../afterResult";
import { buildTodayMenu } from "../progression";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

function sep(day: number, hour: number, minute = 0): string {
  return new Date(2026, 8, day, hour, minute).toISOString();
}

/** 「今日」は9月20日（ローカル時刻） */
const NOW = new Date(2026, 8, 20, 21, 0);

function makePhrase(overrides: Partial<PracticePhrase> = {}): PracticePhrase {
  return {
    id: "p1",
    videoId: "abc123def45",
    videoTitle: "テスト動画",
    name: "イントロのリフ",
    startSec: 10,
    endSec: 20,
    currentBpm: 90,
    initialBpm: 90,
    targetBpm: 120,
    playbackRate: 1,
    createdAt: sep(1, 12),
    updatedAt: sep(1, 12),
    ...overrides,
  };
}

function makeAttempt(overrides: Partial<PhraseAttempt> = {}): PhraseAttempt {
  return {
    id: "a1",
    phraseId: "p1",
    date: sep(20, 20),
    bpm: 95,
    result: "ok",
    ...overrides,
  };
}

function plan(phrase: PracticePhrase, attempts: PhraseAttempt[], attempt: PhraseAttempt, phrases = [phrase]) {
  return planAfterResult({
    phrase,
    attempts,
    attempt,
    todayMenu: buildTodayMenu(phrases, attempts, NOW),
  });
}

describe("planAfterResult: 卒業日", () => {
  it("目標ちょうどのBPMで弾けたら卒業日を返す", () => {
    const phrase = makePhrase({ targetBpm: 120 });
    const attempt = makeAttempt({ bpm: 120, date: sep(20, 20) });
    expect(plan(phrase, [], attempt).graduatedAt).toBe(sep(20, 20));
  });

  it("目標未満のBPMやok以外では卒業日を返さない", () => {
    const phrase = makePhrase({ targetBpm: 120 });
    expect(plan(phrase, [], makeAttempt({ bpm: 119 })).graduatedAt).toBeUndefined();
    expect(plan(phrase, [], makeAttempt({ bpm: 120, result: "partial" })).graduatedAt).toBeUndefined();
    expect(plan(phrase, [], makeAttempt({ bpm: 120, result: "ng" })).graduatedAt).toBeUndefined();
  });

  it("卒業日が保存済みなら返さない", () => {
    const phrase = makePhrase({ targetBpm: 120, graduatedAt: sep(10, 9) });
    expect(plan(phrase, [], makeAttempt({ bpm: 125 })).graduatedAt).toBeUndefined();
  });

  it("卒業日が未保存で過去に目標以上のok記録があれば、その最初の日付を返す（今日へ前進しない）", () => {
    const phrase = makePhrase({ targetBpm: 120 });
    const past = [
      makeAttempt({ id: "late", bpm: 121, date: sep(15, 20) }),
      makeAttempt({ id: "first", bpm: 120, date: sep(12, 20) }),
      makeAttempt({ id: "other", phraseId: "p2", bpm: 200, date: sep(5, 20) }),
    ];
    const attempt = makeAttempt({ id: "now", bpm: 122, date: sep(20, 20) });
    expect(plan(phrase, past, attempt).graduatedAt).toBe(sep(12, 20));
  });
});

describe("planAfterResult: 次の1本", () => {
  it("フレーズが1本だけなら次は無い", () => {
    const phrase = makePhrase();
    expect(plan(phrase, [], makeAttempt()).next).toBeUndefined();
  });

  it("記録した本人・卒業済み・本日達成済みを除いた先頭を返す", () => {
    const self = makePhrase({ id: "self" });
    const graduated = makePhrase({ id: "graduated", currentBpm: 120, initialBpm: 120, targetBpm: 120 });
    // 前日に90で弾けているので今日の目標は95。今日95で弾けて達成済み
    const reachedToday = makePhrase({ id: "reached" });
    const open = makePhrase({ id: "open", updatedAt: sep(2, 12) });
    const attempts = [
      makeAttempt({ id: "r1", phraseId: "reached", bpm: 90, date: sep(19, 20), result: "partial" }),
      makeAttempt({ id: "r2", phraseId: "reached", bpm: 90, date: sep(20, 19) }),
    ];
    const phrases = [self, graduated, reachedToday, open];
    const menu = buildTodayMenu(phrases, attempts, NOW);
    // 達成済みのフレーズはretry区分で先頭に並ぶため、除外条件が無ければこちらが選ばれる
    expect(menu[0].phrase.id).toBe("reached");
    expect(menu.find((e) => e.phrase.id === "reached")?.today.reached).toBe(true);

    const result = plan(self, attempts, makeAttempt({ phraseId: "self" }), phrases);
    expect(result.next?.phrase.id).toBe("open");
  });

  it("次の1本の開始BPMは前回のBPMではなく今日の目標（+5済み）", () => {
    const self = makePhrase({ id: "self" });
    const next = makePhrase({ id: "next", currentBpm: 100, initialBpm: 100 });
    const attempts = [makeAttempt({ id: "n1", phraseId: "next", bpm: 100, date: sep(19, 20) })];
    const result = plan(self, attempts, makeAttempt({ phraseId: "self" }), [self, next]);
    expect(result.next).toEqual({ phrase: next, startBpm: 105 });
  });

  it("開始BPMはbuildTodayMenuの今日の目標と常に一致する（性質テスト）", () => {
    const bpm = fc.integer({ min: 40, max: 240 });
    const phraseArb = fc.record({ initialBpm: bpm, targetBpm: bpm });
    const recordArb = fc.record({
      phraseIndex: fc.nat({ max: 4 }),
      day: fc.integer({ min: 2, max: 20 }),
      hour: fc.integer({ min: 0, max: 23 }),
      bpm,
      result: fc.constantFrom<PhraseAttempt["result"]>("ok", "partial", "ng"),
    });
    fc.assert(
      fc.property(
        fc.array(phraseArb, { minLength: 2, maxLength: 5 }),
        fc.array(recordArb, { maxLength: 20 }),
        fc.nat({ max: 4 }),
        (phraseSpecs, records, selfIndexSeed) => {
          const phrases = phraseSpecs.map((spec, i) =>
            makePhrase({
              id: `p${i}`,
              currentBpm: spec.initialBpm,
              initialBpm: spec.initialBpm,
              targetBpm: spec.targetBpm,
              updatedAt: sep(1, i),
            }),
          );
          const attempts = records
            .filter((r) => r.phraseIndex < phrases.length)
            .map((r, i) =>
              makeAttempt({
                id: `a${i}`,
                phraseId: `p${r.phraseIndex}`,
                date: sep(r.day, r.hour),
                bpm: r.bpm,
                result: r.result,
              }),
            );
          const self = phrases[selfIndexSeed % phrases.length];
          const menu = buildTodayMenu(phrases, attempts, NOW);
          const result = planAfterResult({
            phrase: self,
            attempts,
            attempt: makeAttempt({ id: "now", phraseId: self.id, date: sep(20, 21) }),
            todayMenu: menu,
          });

          const expected = filterOpenMenuEntries(menu).find((e) => e.phrase.id !== self.id);
          if (!expected) {
            expect(result.next).toBeUndefined();
            return;
          }
          expect(result.next?.phrase.id).toBe(expected.phrase.id);
          expect(result.next?.startBpm).toBe(expected.today.targetBeforeToday);
          expect(expected.today.reached).toBe(false);
          expect(expected.priority).not.toBe("graduated");
        },
      ),
    );
  });
});
