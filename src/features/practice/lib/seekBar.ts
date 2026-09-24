import type { ABLoop } from "@/shared/types/models";

/** シークバー上のA/B点マーカー */
export type SeekBarMarker = {
  ratio: number;
  label: "A" | "B";
};

/**
 * 再生位置を0〜1の比率に変換する
 * @param time - 再生位置（秒）
 * @param duration - 動画の総時間（秒）。0以下なら0を返す（再生時間未取得時のゼロ除算を避ける）
 */
export function timeToRatio(time: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.max(0, Math.min(1, time / duration));
}

/**
 * シークバー上の比率を再生位置（秒）に変換する
 * @param ratio - シークバー上の比率。0〜1にクランプする
 * @param duration - 動画の総時間（秒）
 */
export function ratioToTime(ratio: number, duration: number): number {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  return clampedRatio * Math.max(0, duration);
}

/**
 * ABループのA点・B点をシークバー上のマーカー位置に変換する
 * @param abLoop - 対象のABループ設定
 * @param duration - 動画の総時間（秒）
 */
export function markerRatios(
  abLoop: Pick<ABLoop, "pointA" | "pointB">,
  duration: number,
): SeekBarMarker[] {
  const markers: SeekBarMarker[] = [];
  if (abLoop.pointA !== null) {
    markers.push({ ratio: timeToRatio(abLoop.pointA, duration), label: "A" });
  }
  if (abLoop.pointB !== null) {
    markers.push({ ratio: timeToRatio(abLoop.pointB, duration), label: "B" });
  }
  return markers;
}
