import { markerRatios, ratioToTime, timeToRatio } from "../seekBar";

describe("timeToRatio", () => {
  it("再生位置を0〜1の比率に変換する", () => {
    expect(timeToRatio(30, 120)).toBe(0.25);
  });

  it("durationが0なら0を返す（ゼロ除算を避ける）", () => {
    expect(timeToRatio(30, 0)).toBe(0);
  });

  it("durationが負のときも0を返す", () => {
    expect(timeToRatio(30, -10)).toBe(0);
  });

  it("timeがdurationを超えても1にクランプする", () => {
    expect(timeToRatio(200, 120)).toBe(1);
  });

  it("timeが負でも0にクランプする", () => {
    expect(timeToRatio(-10, 120)).toBe(0);
  });
});

describe("ratioToTime", () => {
  it("比率を再生位置（秒）に変換する", () => {
    expect(ratioToTime(0.5, 120)).toBe(60);
  });

  it("比率が1を超えても1にクランプする", () => {
    expect(ratioToTime(1.5, 120)).toBe(120);
  });

  it("比率が負でも0にクランプする", () => {
    expect(ratioToTime(-0.5, 120)).toBe(0);
  });
});

describe("markerRatios", () => {
  it("A点・B点の両方をマーカーに変換する", () => {
    const markers = markerRatios({ pointA: 30, pointB: 90 }, 120);
    expect(markers).toEqual([
      { ratio: 0.25, label: "A" },
      { ratio: 0.75, label: "B" },
    ]);
  });

  it("未設定の点はマーカーに含めない", () => {
    expect(markerRatios({ pointA: null, pointB: 90 }, 120)).toEqual([
      { ratio: 0.75, label: "B" },
    ]);
    expect(markerRatios({ pointA: null, pointB: null }, 120)).toEqual([]);
  });
});
