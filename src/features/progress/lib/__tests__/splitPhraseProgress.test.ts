import * as fc from "fast-check";
import { splitPhraseProgress, type PhraseProgressSummary } from "../phraseProgress";
import { buildTodayMenu } from "@/features/practice/lib/progression";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

const BASE_TIME = Date.UTC(2026, 8, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

function makePhrase(overrides: Partial<PracticePhrase> & Pick<PracticePhrase, "id">): PracticePhrase {
  return {
    videoId: "abc123def45",
    videoTitle: "テスト動画",
    name: `フレーズ${overrides.id}`,
    startSec: 10,
    endSec: 20,
    currentBpm: 80,
    targetBpm: 120,
    playbackRate: 1,
    createdAt: new Date(BASE_TIME).toISOString(),
    updatedAt: new Date(BASE_TIME).toISOString(),
    ...overrides,
  };
}

const isoArb = fc.integer({ min: 0, max: 60 * DAY_MS }).map((offset) => new Date(BASE_TIME + offset).toISOString());
const bpmArb = fc.integer({ min: 100, max: 140 });

const phraseFieldsArb = fc.record({
  currentBpm: bpmArb,
  targetBpm: bpmArb,
  createdAt: isoArb,
  updatedAt: isoArb,
  archivedAt: fc.option(isoArb, { nil: undefined }),
  graduatedAt: fc.option(isoArb, { nil: undefined }),
});

const phrasesArb = fc
  .array(phraseFieldsArb, { minLength: 1, maxLength: 6 })
  .map((list) => list.map((fields, i) => makePhrase({ id: `p${i}`, ...fields })));

function attemptsArb(phraseIds: string[], idPrefix: string): fc.Arbitrary<PhraseAttempt[]> {
  return fc
    .array(
      fc.record({
        phraseId: fc.constantFrom(...phraseIds),
        date: isoArb,
        bpm: bpmArb,
        result: fc.constantFrom<PhraseAttempt["result"]>("ok", "partial", "ng"),
      }),
      { maxLength: 12 },
    )
    .map((list) => list.map((fields, i) => ({ id: `${idPrefix}${i}`, ...fields })));
}

const phrasesAndAttemptsArb = phrasesArb.chain((phrases) =>
  attemptsArb(
    phrases.map((p) => p.id),
    "a",
  ).map((attempts) => ({ phrases, attempts })),
);

function findSummary(
  split: ReturnType<typeof splitPhraseProgress>,
  phraseId: string,
): PhraseProgressSummary | undefined {
  return [...split.inProgress, ...split.graduated].find((s) => s.phrase.id === phraseId);
}

function isSortedDesc(times: number[]): boolean {
  return times.every((time, i) => i === 0 || times[i - 1] >= time);
}

describe("splitPhraseProgress", () => {
  it("フレーズBを130で弾けても、目標120・到達100のフレーズAは上達中のまま", () => {
    const phraseA = makePhrase({ id: "a", currentBpm: 100, targetBpm: 120 });
    const phraseB = makePhrase({ id: "b", currentBpm: 110, targetBpm: 150 });
    const attempts: PhraseAttempt[] = [
      { id: "t1", phraseId: "b", date: "2026-09-10T21:00:00.000Z", bpm: 130, result: "ok" },
    ];

    const { inProgress, graduated } = splitPhraseProgress([phraseA, phraseB], attempts);

    expect(graduated).toEqual([]);
    const summaryA = inProgress.find((s) => s.phrase.id === "a");
    expect(summaryA?.currentBpm).toBe(100);
    expect(summaryA?.graduatedAt).toBeUndefined();
  });

  it("どのフレーズのサマリも、他フレーズの記録を足したり消したりしても変わらない", () => {
    fc.assert(
      fc.property(
        phrasesArb.chain((phrases) => {
          const ids = phrases.map((p) => p.id);
          return fc.record({
            phrases: fc.constant(phrases),
            targetId: fc.constantFrom(...ids),
            attempts: attemptsArb(ids, "a"),
            extra: attemptsArb([...ids, "deleted-phrase"], "x"),
          });
        }),
        ({ phrases, targetId, attempts, extra }) => {
          const own = attempts.filter((a) => a.phraseId === targetId);
          const others = [...attempts, ...extra].filter((a) => a.phraseId !== targetId);

          const alone = findSummary(splitPhraseProgress(phrases, own), targetId);
          const mixed = findSummary(splitPhraseProgress(phrases, [...others, ...own]), targetId);

          expect(mixed).toEqual(alone);
        },
      ),
    );
  });

  it("上達中と卒業に重なりが無く、合わせると未アーカイブのフレーズ全件と一致する", () => {
    fc.assert(
      fc.property(phrasesAndAttemptsArb, ({ phrases, attempts }) => {
        const { inProgress, graduated } = splitPhraseProgress(phrases, attempts);
        const inProgressIds = inProgress.map((s) => s.phrase.id);
        const graduatedIds = graduated.map((s) => s.phrase.id);

        expect(inProgressIds.filter((id) => graduatedIds.includes(id))).toEqual([]);
        expect([...inProgressIds, ...graduatedIds].sort()).toEqual(
          phrases
            .filter((p) => !p.archivedAt)
            .map((p) => p.id)
            .sort(),
        );
      }),
    );
  });

  it("卒業に入るフレーズは、今日タブで目標到達済み（graduated）になるフレーズと一致する", () => {
    fc.assert(
      fc.property(phrasesAndAttemptsArb, ({ phrases, attempts }) => {
        const graduatedIds = splitPhraseProgress(phrases, attempts).graduated.map((s) => s.phrase.id);
        const todayGraduatedIds = buildTodayMenu(phrases, attempts, new Date(BASE_TIME + 90 * DAY_MS))
          .filter((entry) => entry.priority === "graduated")
          .map((entry) => entry.phrase.id);

        expect([...graduatedIds].sort()).toEqual([...todayGraduatedIds].sort());
      }),
    );
  });

  it("卒業は卒業日が新しい順、上達中は更新日時が新しい順に並ぶ", () => {
    fc.assert(
      fc.property(phrasesAndAttemptsArb, ({ phrases, attempts }) => {
        const { inProgress, graduated } = splitPhraseProgress(phrases, attempts);

        expect(isSortedDesc(graduated.map((s) => Date.parse(s.graduatedAt)))).toBe(true);
        expect(isSortedDesc(inProgress.map((s) => Date.parse(s.phrase.updatedAt)))).toBe(true);
      }),
    );
  });
});
