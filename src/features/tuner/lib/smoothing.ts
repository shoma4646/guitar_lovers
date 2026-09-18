/**
 * ピッチ検出値の平滑化
 *
 * 検出器は1バッファごとに周波数と信頼度（clarity）を返すが、単発のノイズや
 * アタック直後の不安定な値をそのまま表示すると針が暴れる。信頼度と周波数範囲で
 * フィルタしたうえで直近数件の中央値を返す。
 */

export interface PitchSmootherOptions {
  /** 中央値を取る直近サンプル数 */
  windowSize: number;
  /** この信頼度未満の検出値は捨てる（0〜1） */
  minClarity: number;
  minHz: number;
  maxHz: number;
  /** 連続してこの回数捨てたら無音とみなして窓をリセットする */
  maxMisses: number;
  /**
   * 直前の中央値からちょうど1オクターブ（±このセント数）飛んだ値を無効とみなす。
   * 減衰末期に基音が消えて2倍音へ飛ぶ誤検出を、無音扱いに落とすため
   */
  octaveRejectCents: number;
}

export interface PitchSmoother {
  /** 検出値を1件追加し、表示用の平滑化済み周波数を返す（無音ならnull） */
  push(hz: number, clarity: number): number | null;
  reset(): void;
}

/** ギターの音域に合わせた既定値 */
export const DEFAULT_SMOOTHER_OPTIONS: PitchSmootherOptions = {
  windowSize: 5,
  minClarity: 0.9,
  minHz: 60,
  maxHz: 1200,
  maxMisses: 3,
  octaveRejectCents: 50,
};

function isOctaveJump(hz: number, window: number[], toleranceCents: number): boolean {
  if (window.length === 0) return false;
  const cents = Math.abs(1200 * Math.log2(hz / median(window)));
  return Math.abs(cents - 1200) <= toleranceCents;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** ピッチ平滑化器を生成する */
export function createPitchSmoother(
  options: Partial<PitchSmootherOptions> = {},
): PitchSmoother {
  const opts = { ...DEFAULT_SMOOTHER_OPTIONS, ...options };
  let window: number[] = [];
  let misses = 0;

  return {
    push(hz, clarity) {
      const isValid =
        Number.isFinite(hz) &&
        clarity >= opts.minClarity &&
        hz >= opts.minHz &&
        hz <= opts.maxHz &&
        !isOctaveJump(hz, window, opts.octaveRejectCents);

      if (!isValid) {
        misses += 1;
        if (misses >= opts.maxMisses) {
          window = [];
          misses = 0;
          return null;
        }
        return window.length > 0 ? median(window) : null;
      }

      misses = 0;
      window.push(hz);
      if (window.length > opts.windowSize) {
        window.shift();
      }
      return median(window);
    },
    reset() {
      window = [];
      misses = 0;
    },
  };
}
