import * as fc from "fast-check";
import {
  INITIAL_ANNOUNCEMENT_MEMORY,
  nextTuningAnnouncement,
  type AnnouncementMemory,
  type TuningJudgement,
} from "../announcement";

function run(judgements: (TuningJudgement | null)[]): (string | null)[] {
  let memory: AnnouncementMemory = INITIAL_ANNOUNCEMENT_MEMORY;
  return judgements.map((j) => {
    const result = nextTuningAnnouncement(memory, j);
    memory = result.memory;
    return result.text;
  });
}

const flat6: TuningJudgement = { stringNumber: 6, state: "flat", tuned: false };
const in6: TuningJudgement = { stringNumber: 6, state: "in", tuned: false };
const tuned6: TuningJudgement = { stringNumber: 6, state: "in", tuned: true };

describe("nextTuningAnnouncement", () => {
  it("状態が変わったら弦番号付きの文言を返す", () => {
    expect(run([flat6])).toEqual(["6弦: 低い・少し締める"]);
    expect(run([{ stringNumber: 5, state: "sharp", tuned: false }])).toEqual(["5弦: 高い・少し緩める"]);
  });

  it("同じ弦・同じ状態が続く間は告知しない", () => {
    expect(run([flat6, flat6, null, flat6])).toEqual(["6弦: 低い・少し締める", null, null, null]);
  });

  it("弦が変われば同じ状態でも告知する", () => {
    expect(run([flat6, { stringNumber: 5, state: "flat", tuned: false }])).toEqual([
      "6弦: 低い・少し締める",
      "5弦: 低い・少し締める",
    ]);
  });

  it("未完了の弦が許容範囲に入っただけでは告知せず、完了したら「合いました」を1回だけ告知する", () => {
    expect(run([flat6, in6, tuned6, tuned6])).toEqual([
      "6弦: 低い・少し締める",
      null,
      "6弦: 合いました",
      null,
    ]);
  });

  it("完了後にずれて戻ったときは「合っています」で、「合いました」は繰り返さない", () => {
    const flatTuned6: TuningJudgement = { stringNumber: 6, state: "flat", tuned: true };
    const in5: TuningJudgement = { stringNumber: 5, state: "in", tuned: true };
    expect(run([tuned6, flatTuned6, tuned6, in5, tuned6])).toEqual([
      "6弦: 合いました",
      "6弦: 低い・少し締める",
      "6弦: 合っています",
      "5弦: 合いました",
      "6弦: 合っています",
    ]);
  });

  it("完了がリセットされた弦（プリセット切替など）は、再び完了したときにまた「合いました」を告知する", () => {
    expect(run([tuned6, flat6, in6, tuned6])).toEqual([
      "6弦: 合いました",
      "6弦: 低い・少し締める",
      null,
      "6弦: 合いました",
    ]);
  });

  it("同じ判定を2回続けて渡したとき、2回目は必ず告知しない（property）", () => {
    const judgementArb = fc.option(
      fc.record({
        stringNumber: fc.integer({ min: 1, max: 6 }),
        state: fc.constantFrom("in" as const, "flat" as const, "sharp" as const),
        tuned: fc.boolean(),
      }),
    );
    fc.assert(
      fc.property(fc.array(judgementArb), judgementArb, (history, j) => {
        const texts = run([...history, j, j]);
        expect(texts[texts.length - 1]).toBeNull();
      }),
    );
  });
});
