import * as fc from "fast-check";
import { planReminder } from "../planReminder";
import { buildTodayMenu } from "@/features/practice/lib/progression";
import { DEFAULT_REMINDER_SETTINGS } from "@/shared/lib/schemas/reminderSettings";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

const now = new Date(2026, 8, 16, 10);
const settings = { ...DEFAULT_REMINDER_SETTINGS, enabled: true };
const GRADUATED_PATTERN = /に届いています/;
const TODAY_BPM_PATTERN = /今日は(\d+)/;

function makePhrase(overrides: Partial<PracticePhrase> & Pick<PracticePhrase, "id" | "name">): PracticePhrase {
  return {
    videoId: "abc123def45",
    videoTitle: "テスト動画",
    startSec: 10,
    endSec: 20,
    currentBpm: 80,
    targetBpm: 120,
    playbackRate: 1,
    createdAt: new Date(2026, 8, 1).toISOString(),
    updatedAt: new Date(2026, 8, 1).toISOString(),
    ...overrides,
  };
}

function makeAttempt(
  id: string,
  phraseId: string,
  daysAgo: number,
  bpm: number,
  result: PhraseAttempt["result"],
): PhraseAttempt {
  return {
    id,
    phraseId,
    date: new Date(2026, 8, 16 - daysAgo, 21).toISOString(),
    bpm,
    result,
  };
}

/** 予約された通知の対象フレーズについて、通知が届く日の今日のメニューの行を返す */
function findMenuEntry(phrases: PracticePhrase[], attempts: PhraseAttempt[], phraseId: string, fireAt: Date) {
  const entry = buildTodayMenu(phrases, attempts, fireAt).find((e) => e.phrase.id === phraseId);
  if (!entry) throw new Error(`今日のメニューに ${phraseId} が無い`);
  return entry;
}

describe("planReminder（フレーズが複数あるとき）", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("別のフレーズの「弾けた」記録で、対象フレーズを目標到達と伝えない", () => {
    const phrases = [
      makePhrase({ id: "a", name: "Aメロのリフ", currentBpm: 80, targetBpm: 120 }),
      makePhrase({ id: "b", name: "サビ", currentBpm: 150, targetBpm: 150 }),
    ];
    const attempts = [makeAttempt("t1", "a", 2, 80, "ng"), makeAttempt("t2", "b", 3, 150, "ok")];

    const plan = planReminder({ phrases, attempts, sessions: [], settings, now });

    expect(plan!.data.phraseId).toBe("a");
    expect(plan!.body).toBe("『Aメロのリフ』、前回は80で練習しました。今日は80から");
  });

  it("保存済みの到達BPMが未更新でも、記録で目標に届いていれば目標到達と伝える", () => {
    const phrases = [
      makePhrase({ id: "a", name: "Aメロのリフ", currentBpm: 110, targetBpm: 120 }),
      makePhrase({ id: "b", name: "サビ", currentBpm: 150, targetBpm: 150 }),
    ];
    const attempts = [makeAttempt("t1", "a", 2, 120, "ok"), makeAttempt("t2", "b", 3, 150, "ok")];

    const plan = planReminder({ phrases, attempts, sessions: [], settings, now });

    expect(plan!.body).toMatch(GRADUATED_PATTERN);
    expect(findMenuEntry(phrases, attempts, plan!.data.phraseId, plan!.fireAt).priority).toBe("graduated");
  });

  describe("性質: フレーズ2〜3本と記録が混在していても文面は対象フレーズの行と一致する", () => {
    const bpmArb = fc.integer({ min: 60, max: 150 });
    const phraseSpecArb = fc.record({
      currentBpm: bpmArb,
      targetBpm: bpmArb,
      initialBpm: fc.option(bpmArb, { nil: undefined }),
      createdDaysAgo: fc.integer({ min: 11, max: 20 }),
    });
    const attemptSpecArb = fc.record({
      phraseIndex: fc.nat({ max: 2 }),
      daysAgo: fc.integer({ min: 1, max: 10 }),
      bpm: bpmArb,
      result: fc.constantFrom<PhraseAttempt["result"]>("ok", "partial", "ng"),
    });
    const scenarioArb = fc
      .record({
        phraseSpecs: fc.array(phraseSpecArb, { minLength: 2, maxLength: 3 }),
        attemptSpecs: fc.array(attemptSpecArb, { maxLength: 12 }),
      })
      .map(({ phraseSpecs, attemptSpecs }) => {
        const phrases = phraseSpecs.map((spec, i) =>
          makePhrase({
            id: `p${i}`,
            name: `フレーズ${i}`,
            currentBpm: spec.currentBpm,
            targetBpm: spec.targetBpm,
            // 到達BPMは保存時のBPMから上がる一方のため、保存時のBPMは到達BPM以下に限る
            initialBpm: spec.initialBpm === undefined ? undefined : Math.min(spec.initialBpm, spec.currentBpm),
            createdAt: new Date(2026, 8, 16 - spec.createdDaysAgo).toISOString(),
            updatedAt: new Date(2026, 8, 16 - spec.createdDaysAgo).toISOString(),
          }),
        );
        const attempts = attemptSpecs.map((spec, i) =>
          makeAttempt(`t${i}`, `p${spec.phraseIndex % phrases.length}`, spec.daysAgo, spec.bpm, spec.result),
        );
        return { phrases, attempts };
      });

    it("卒業扱いでない行なら、文面の「今日は N」は通知が届く日の今日のメニューで同じフレーズの行の今日の開始BPMと一致する", () => {
      fc.assert(
        fc.property(scenarioArb, ({ phrases, attempts }) => {
          const plan = planReminder({ phrases, attempts, sessions: [], settings, now });
          const entry = findMenuEntry(phrases, attempts, plan!.data.phraseId, plan!.fireAt);
          if (entry.priority === "graduated") return;

          expect(plan!.body).toMatch(TODAY_BPM_PATTERN);
          expect(Number(plan!.body.match(TODAY_BPM_PATTERN)![1])).toBe(entry.today.targetBeforeToday);
        }),
      );
    });

    it("「届いています」の文面になるのは、その行が卒業扱いのときだけで、卒業扱いなら必ずその文面になる", () => {
      fc.assert(
        fc.property(scenarioArb, ({ phrases, attempts }) => {
          const plan = planReminder({ phrases, attempts, sessions: [], settings, now });
          const entry = findMenuEntry(phrases, attempts, plan!.data.phraseId, plan!.fireAt);

          expect(GRADUATED_PATTERN.test(plan!.body)).toBe(entry.priority === "graduated");
        }),
      );
    });
  });
});
