import * as fc from "fast-check";
import { tuningPresets, type TuningPresetKey } from "@/shared/constants/tuning";
import { nearestStringInPreset, noteToFrequency } from "../pitch";
import { createPitchSmoother, DEFAULT_SMOOTHER_OPTIONS } from "../smoothing";

// 4096サンプル / 44.1kHz で1回の検出にかかる時間
const FRAME_MS = 93;

/** 平滑化と弦判定をつないで、各検出値に対する表示上の弦インデックス（表示なしはnull）を返す */
function runPipeline(hzSequence: number[], notes: string[]): (number | null)[] {
  const smoother = createPitchSmoother();
  return hzSequence.map((hz, i) => {
    const smoothed = smoother.push(hz, 1, i * FRAME_MS);
    return smoothed === null ? null : (nearestStringInPreset(smoothed, notes)?.index ?? null);
  });
}

const presetKeys = Object.keys(tuningPresets) as TuningPresetKey[];

describe("平滑化と弦判定をつないだときの2倍音への飛び", () => {
  it("E2の後にE3が4回以上続いても、4弦として案内しない", () => {
    const e2 = noteToFrequency("E2");
    const sequence = [e2, 2 * e2, 2 * e2, 2 * e2, 2 * e2, 2 * e2, 2 * e2];
    const results = runPipeline(sequence, tuningPresets.standard.notes);
    results.forEach((index) => expect([0, null]).toContain(index));
    expect(results[0]).toBe(0);
  });

  it("A2の後にA3が続いても、3弦として案内しない", () => {
    const a2 = noteToFrequency("A2");
    const sequence = [a2, 2 * a2, 2 * a2, 2 * a2, 2 * a2, 2 * a2];
    const results = runPipeline(sequence, tuningPresets.standard.notes);
    results.forEach((index) => expect([1, null]).toContain(index));
    expect(results[0]).toBe(1);
  });

  it("任意のプリセット・弦で、基音の後に基音と2倍音がどの順で続いても、結果はその弦か表示なしになる", () => {
    const maxOctaveRun = Math.floor(DEFAULT_SMOOTHER_OPTIONS.octaveMemoryMs / FRAME_MS);
    fc.assert(
      fc.property(
        fc.constantFrom(...presetKeys),
        fc.integer({ min: 0, max: 5 }),
        fc.double({ min: -50, max: 50, noNaN: true }),
        fc.array(fc.integer({ min: 0, max: maxOctaveRun }), { minLength: 1, maxLength: 8 }),
        (presetKey, stringIndex, detuneCents, octaveRuns) => {
          const notes = tuningPresets[presetKey].notes;
          const f0 = noteToFrequency(notes[stringIndex]) * Math.pow(2, detuneCents / 1200);
          // 2倍音の連続は記憶時間内に収め、各連続の間に基音を1回挟む
          const sequence = octaveRuns.flatMap((run) => [f0, ...Array<number>(run).fill(2 * f0)]);
          const results = runPipeline(sequence, notes);
          return results.every((index) => index === stringIndex || index === null);
        },
      ),
    );
  });

  it("記憶時間を超えて2倍音だけが続いたら、新しい音として採用する", () => {
    const d2 = noteToFrequency("D2");
    const smoother = createPitchSmoother();
    smoother.push(d2, 1, 0);
    const memoryMs = DEFAULT_SMOOTHER_OPTIONS.octaveMemoryMs;
    let t = FRAME_MS;
    while (t <= memoryMs) {
      smoother.push(2 * d2, 1, t);
      t += FRAME_MS;
    }
    expect(smoother.push(2 * d2, 1, t)).toBeCloseTo(2 * d2, 6);
  });
});
