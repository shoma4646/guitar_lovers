/**
 * ピッチ検出の前に入力を間引く率。4にすると1弦12フレット以上で精度が約1cent落ちるため2にする
 */
export const PITCH_DECIMATION_FACTOR = 2;

/**
 * 隣り合う `factor` サンプルの平均を1サンプルにして、サンプル数とサンプルレートを `1/factor` にする
 *
 * 平均は簡易なローパスとして働き、間引きで高域が低域へ折り返すのを抑える。端数のサンプルは捨てる
 * @param pcm - 入力のPCM
 * @param factor - 間引き率（1以上の整数）
 */
export function decimateByAverage(pcm: Float32Array, factor: number): Float32Array {
  const length = Math.floor(pcm.length / factor);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    const offset = i * factor;
    for (let j = 0; j < factor; j++) {
      sum += pcm[offset + j];
    }
    out[i] = sum / factor;
  }
  return out;
}
