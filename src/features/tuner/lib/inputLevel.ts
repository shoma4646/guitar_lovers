/**
 * マイク入力レベルの計算（RMS振幅とdBFS）
 */

/** PCMフレームのRMS振幅（フルスケール1.0）を返す。空のフレームは0 */
export function computeRms(pcm: Float32Array): number {
  if (pcm.length === 0) return 0;
  let squareSum = 0;
  for (let i = 0; i < pcm.length; i += 1) {
    squareSum += pcm[i] * pcm[i];
  }
  return Math.sqrt(squareSum / pcm.length);
}

/** RMS振幅をdBFS（フルスケール1.0 = 0 dB）に変換する。無音は-Infinity */
export function rmsToDbfs(rms: number): number {
  return rms > 0 ? 20 * Math.log10(rms) : Number.NEGATIVE_INFINITY;
}
