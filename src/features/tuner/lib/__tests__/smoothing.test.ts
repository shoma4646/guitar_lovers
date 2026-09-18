import { createPitchSmoother } from "../smoothing";

describe("createPitchSmoother", () => {
  it("信頼度が閾値未満の値は捨てる", () => {
    const smoother = createPitchSmoother({ minClarity: 0.9 });
    expect(smoother.push(110, 0.5)).toBeNull();
  });

  it("音域外の値は捨てる", () => {
    const smoother = createPitchSmoother({ minHz: 60, maxHz: 1200 });
    expect(smoother.push(20, 1)).toBeNull();
    expect(smoother.push(5000, 1)).toBeNull();
  });

  it("直近windowSize件の中央値を返す", () => {
    const smoother = createPitchSmoother({ windowSize: 3 });
    smoother.push(100, 1);
    smoother.push(150, 1);
    expect(smoother.push(110, 1)).toBe(110);
    expect(smoother.push(105, 1)).toBe(110);
  });

  it("単発のノイズは中央値で吸収される", () => {
    const smoother = createPitchSmoother({ windowSize: 5 });
    [110, 110, 110, 110].forEach((hz) => smoother.push(hz, 1));
    expect(smoother.push(220, 1)).toBe(110);
  });

  it("無効値がmaxMisses未満なら直前の値を保持する", () => {
    const smoother = createPitchSmoother({ maxMisses: 3 });
    smoother.push(110, 1);
    expect(smoother.push(0, 0)).toBe(110);
    expect(smoother.push(0, 0)).toBe(110);
  });

  it("無効値がmaxMisses回続いたらnullに戻る", () => {
    const smoother = createPitchSmoother({ maxMisses: 2 });
    smoother.push(110, 1);
    smoother.push(0, 0);
    expect(smoother.push(0, 0)).toBeNull();
    expect(smoother.push(220, 1)).toBe(220);
  });

  it("maxMisses回無効が続いてnullに戻った後、有効値が来たら即座に窓が再開して値を返す", () => {
    const smoother = createPitchSmoother({ maxMisses: 2, windowSize: 3 });
    smoother.push(110, 1);
    smoother.push(0, 0);
    expect(smoother.push(0, 0)).toBeNull();
    expect(smoother.push(0, 0)).toBeNull();
    expect(smoother.push(220, 1)).toBe(220);
    expect(smoother.push(225, 1)).toBe(222.5);
  });

  it("直前の中央値からちょうど1オクターブ上へ飛んだ値は無効として直前値を保持する", () => {
    const smoother = createPitchSmoother({ maxMisses: 3, windowSize: 3 });
    smoother.push(196, 1);
    smoother.push(196, 1);
    expect(smoother.push(392, 1)).toBe(196);
    expect(smoother.push(391, 1)).toBe(196);
    expect(smoother.push(393, 1)).toBeNull();
  });

  it("オクターブ以外の跳躍（別の弦へ移った）は通常どおり採用する", () => {
    const smoother = createPitchSmoother({ windowSize: 3 });
    smoother.push(196, 1);
    smoother.push(196, 1);
    smoother.push(247, 1);
    smoother.push(247, 1);
    expect(smoother.push(247, 1)).toBe(247);
  });

  it("既定値では信頼度0.9未満と60〜1200Hz外を捨て、3回連続で無音に戻る", () => {
    const smoother = createPitchSmoother();
    expect(smoother.push(110, 0.89)).toBeNull();
    expect(smoother.push(59, 1)).toBeNull();
    expect(smoother.push(1201, 1)).toBeNull();
    expect(smoother.push(110, 0.9)).toBe(110);
    smoother.push(0, 0);
    smoother.push(0, 0);
    expect(smoother.push(0, 0)).toBeNull();
  });

  it("resetで窓が空になる", () => {
    const smoother = createPitchSmoother();
    smoother.push(110, 1);
    smoother.reset();
    expect(smoother.push(220, 1)).toBe(220);
  });
});
