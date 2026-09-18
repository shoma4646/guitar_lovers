import { computeRms, rmsToDbfs } from "../inputLevel";

describe("computeRms", () => {
  it("無音のフレームは0", () => {
    expect(computeRms(new Float32Array(8))).toBe(0);
  });

  it("空のフレームは0", () => {
    expect(computeRms(new Float32Array(0))).toBe(0);
  });

  it("振幅一定の矩形波はその振幅を返す", () => {
    expect(computeRms(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5, 6);
  });

  it("正弦波は振幅の1/√2になる", () => {
    const pcm = new Float32Array(1000);
    for (let i = 0; i < pcm.length; i += 1) {
      pcm[i] = Math.sin((2 * Math.PI * i * 10) / pcm.length);
    }
    expect(computeRms(pcm)).toBeCloseTo(1 / Math.SQRT2, 3);
  });
});

describe("rmsToDbfs", () => {
  it("フルスケールは0 dB", () => {
    expect(rmsToDbfs(1)).toBe(0);
  });

  it("0.1は-20 dB", () => {
    expect(rmsToDbfs(0.1)).toBeCloseTo(-20, 6);
  });

  it("無音は-Infinity", () => {
    expect(rmsToDbfs(0)).toBe(Number.NEGATIVE_INFINITY);
  });
});
