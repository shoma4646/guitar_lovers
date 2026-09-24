import { clampBpm } from "@/shared/constants/bpm";

/**
 * メトロノームBPMをdelta刻みで変更する
 * @param value - 現在のBPM
 * @param delta - 増減幅（通常は±1。長押し加速でも同じ関数を呼び続ける想定）
 */
export function stepBpm(value: number, delta: number): number {
  return clampBpm(value + delta);
}
