import * as fc from "fast-check";
import { BPM_MAX, BPM_MIN } from "@/shared/constants/bpm";
import { PLAYBACK_RATES } from "@/shared/constants/playback";
import { practicePhraseSchema } from "@/shared/lib/schemas/practicePhrase";
import { phraseAttemptSchema } from "@/shared/lib/schemas/phraseAttempt";
import { parsePhraseDraft, type SavePhraseInput } from "../parsePhraseDraft";
import { buildPhraseAttempt, buildPracticePhrase } from "../practiceRecords";

const NOW = "2026-11-23T10:15:30.000Z";

const videoIdArb = fc.stringMatching(/^[A-Za-z0-9_-]{11}$/);

const videoTitleArb = fc.oneof(fc.constant(""), fc.string());

const tenthSecondRangeArb = fc
  .tuple(fc.integer({ min: 0, max: 36_000 }), fc.integer({ min: 1, max: 3_600 }))
  .map(([startTenths, lengthTenths]) => ({
    pointA: startTenths / 10,
    pointB: (startTenths + lengthTenths) / 10,
  }));

const playbackRateArb = fc.constantFrom(...PLAYBACK_RATES);

const inputArb: fc.Arbitrary<SavePhraseInput> = fc
  .tuple(
    fc.string({ minLength: 1 }).filter((name) => name.trim() !== ""),
    fc.integer({ min: BPM_MIN, max: BPM_MAX - 1 }),
  )
  .chain(([name, currentBpm]) =>
    fc.integer({ min: currentBpm + 1, max: BPM_MAX }).map((targetBpm) => ({ name, currentBpm, targetBpm })),
  )
  .map((draft) => {
    const parsed = parsePhraseDraft({
      name: draft.name,
      currentBpm: String(draft.currentBpm),
      targetBpm: String(draft.targetBpm),
    });
    if (!parsed.ok) throw new Error(parsed.error);
    return parsed.value;
  });

describe("buildPracticePhrase", () => {
  const paramsArb = fc.record({
    id: fc.uuid(),
    input: inputArb,
    range: tenthSecondRangeArb,
    video: fc.record({ videoId: videoIdArb, title: videoTitleArb }),
    playbackRate: playbackRateArb,
  });

  it("どの入力でも保存スキーマを通り、区間・速度・BPMは入力のまま入る", () => {
    fc.assert(
      fc.property(paramsArb, ({ id, input, range, video, playbackRate }) => {
        const phrase = buildPracticePhrase({ id, input, range, video, playbackRate, now: NOW });

        expect(practicePhraseSchema.safeParse(phrase).success).toBe(true);
        expect(phrase.startSec).toBe(range.pointA);
        expect(phrase.endSec).toBe(range.pointB);
        expect(phrase.playbackRate).toBe(playbackRate);
        expect(phrase.currentBpm).toBe(input.currentBpm);
        expect(phrase.initialBpm).toBe(input.currentBpm);
        expect(phrase.targetBpm).toBe(input.targetBpm);
        expect(phrase.videoTitle).not.toBe("");
        expect(phrase).toMatchObject({ id, videoId: video.videoId, name: input.name, createdAt: NOW, updatedAt: NOW });
      }),
    );
  });

  it("動画名があればそのまま、空なら動画IDを含む代替名を入れる", () => {
    const base = {
      id: "p1",
      input: { name: "サビ", currentBpm: 90, targetBpm: 130 },
      range: { pointA: 30.4, pointB: 41.7 },
      playbackRate: 0.75 as const,
      now: NOW,
    };

    expect(buildPracticePhrase({ ...base, video: { videoId: "abc123def45", title: "動画名" } }).videoTitle).toBe("動画名");
    expect(buildPracticePhrase({ ...base, video: { videoId: "abc123def45", title: "" } }).videoTitle).toBe(
      "YouTube動画 (abc123def45)",
    );
  });
});

describe("buildPhraseAttempt", () => {
  const paramsArb = fc.record({
    id: fc.uuid(),
    phraseId: fc.uuid(),
    bpm: fc.integer({ min: BPM_MIN, max: BPM_MAX }),
    result: fc.constantFrom("ok" as const, "partial" as const, "ng" as const),
    completedReps: fc.nat({ max: 1_000 }),
  });

  it("どの入力でも記録スキーマを通り、弾いた回数が1回以上のときだけその回数を reps に入れる", () => {
    fc.assert(
      fc.property(paramsArb, ({ id, phraseId, bpm, result, completedReps }) => {
        const attempt = buildPhraseAttempt({ id, phraseId, date: NOW, bpm, result, completedReps });

        expect(phraseAttemptSchema.safeParse(attempt).success).toBe(true);
        expect(attempt).toMatchObject({ id, phraseId, date: NOW, bpm, result });
        if (completedReps > 0) {
          expect(attempt.reps).toBe(completedReps);
        } else {
          expect(attempt).not.toHaveProperty("reps");
        }
      }),
    );
  });
});
