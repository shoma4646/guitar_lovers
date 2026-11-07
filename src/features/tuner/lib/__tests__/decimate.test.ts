import { PitchDetector } from "pitchy";
import { decimateByAverage, PITCH_DECIMATION_FACTOR } from "../decimate";

const SAMPLE_RATE = 44100;
const BUFFER_LENGTH = 4096;

/** 基音に2〜5倍音を減衰させて重ねた、ギターの弦に近い合成信号 */
function guitarLikeSignal(hz: number): Float32Array {
  const pcm = new Float32Array(BUFFER_LENGTH);
  const harmonics = [1, 0.5, 0.33, 0.25, 0.2];
  for (let i = 0; i < BUFFER_LENGTH; i++) {
    const t = i / SAMPLE_RATE;
    let value = 0;
    harmonics.forEach((amplitude, k) => {
      value += amplitude * Math.sin(2 * Math.PI * hz * (k + 1) * t + k);
    });
    pcm[i] = 0.2 * value;
  }
  return pcm;
}

function detectCentsError(hz: number): number {
  const decimated = decimateByAverage(guitarLikeSignal(hz), PITCH_DECIMATION_FACTOR);
  const detector = PitchDetector.forFloat32Array(decimated.length);
  const [detectedHz] = detector.findPitch(decimated, SAMPLE_RATE / PITCH_DECIMATION_FACTOR);
  return 1200 * Math.log2(detectedHz / hz);
}

describe("decimateByAverage", () => {
  it("隣り合うサンプルの平均を取り、端数は捨てる", () => {
    expect(Array.from(decimateByAverage(new Float32Array([1, 3, 5, 7, 9]), 2))).toEqual([2, 6]);
  });

  it("間引き率1なら入力と同じ値を返す", () => {
    const pcm = new Float32Array([0.1, -0.2, 0.3]);
    expect(Array.from(decimateByAverage(pcm, 1))).toEqual(Array.from(pcm));
  });
});

describe("間引き後のピッチ検出精度", () => {
  it.each([82.41, 110, 146.83, 196, 246.94, 329.63])(
    "標準チューニングの開放弦 %fHz を基準から±1cent以内で検出する",
    (hz) => {
      expect(Math.abs(detectCentsError(hz))).toBeLessThanOrEqual(1);
    },
  );

  it("1弦12フレット付近の 659.26Hz も±2cent以内で検出する", () => {
    expect(Math.abs(detectCentsError(659.26))).toBeLessThanOrEqual(2);
  });
});
