import { centsToMeterRatio, describeTuning, tuningState } from "../meter";

describe("centsToMeterRatio", () => {
  it("0centsは中央（0.5）", () => {
    expect(centsToMeterRatio(0)).toBe(0.5);
  });

  it("-50centsは0、+50centsは1", () => {
    expect(centsToMeterRatio(-50)).toBe(0);
    expect(centsToMeterRatio(50)).toBe(1);
  });

  it("範囲を超えた値は0または1に丸める", () => {
    expect(centsToMeterRatio(-80)).toBe(0);
    expect(centsToMeterRatio(120)).toBe(1);
  });
});

describe("tuningState", () => {
  it("閾値ちょうどはin", () => {
    expect(tuningState(5)).toBe("in");
    expect(tuningState(-5)).toBe("in");
  });

  it("閾値を超えたら低い方はflat、高い方はsharp", () => {
    expect(tuningState(5.1)).toBe("sharp");
    expect(tuningState(-5.1)).toBe("flat");
  });

  it("0はin", () => {
    expect(tuningState(0)).toBe("in");
  });
});

describe("describeTuning", () => {
  it("状態ごとに文言を返す", () => {
    expect(describeTuning("in")).toBe("合っています");
    expect(describeTuning("flat")).toBe("低い・少し締める");
    expect(describeTuning("sharp")).toBe("高い・少し緩める");
  });

  it("stringLabelを渡すと前置きする", () => {
    expect(describeTuning("in", "6弦")).toBe("6弦: 合っています");
  });
});
