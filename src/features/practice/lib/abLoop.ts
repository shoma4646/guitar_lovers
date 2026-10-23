import type { ABLoop } from "@/shared/types/models";

/**
 * A点とB点が両方設定され、B点がA点より後にあるか
 * ループの有効化・解除ボタンの活性判定と、フレーズ保存の可否判定の両方で使う
 * @param abLoop - 対象のABループ設定
 */
export function isValidLoopRange(abLoop: Pick<ABLoop, "pointA" | "pointB">): boolean {
  return abLoop.pointA !== null && abLoop.pointB !== null && abLoop.pointA < abLoop.pointB;
}

/** A点・B点を保存する時刻の刻み（秒） */
const POINT_STEP_SEC = 0.1;
/** 再生位置×10 の浮動小数誤差（0.3 * 10 = 3.0000000000000004 など）で1刻みずれないための許容幅 */
const STEP_EPSILON = 1e-9;

/**
 * ボタンを押した瞬間の再生位置から、A点・B点として保存する時刻を決める
 * 区間を狭めない向きに丸める（A点は0.1秒単位で切り捨て、B点は切り上げ）。B点は動画の長さを超えない（長さ未取得の0なら上限なし）
 * @param point - 設定する点
 * @param currentTime - 押した瞬間の再生位置（秒）
 * @param duration - 動画の総時間（秒）。未取得なら0
 */
export function resolvePointTime(point: "A" | "B", currentTime: number, duration: number): number {
  const steps = currentTime / POINT_STEP_SEC;
  if (point === "A") {
    const a = Math.floor(steps + STEP_EPSILON) * POINT_STEP_SEC;
    return a > currentTime ? currentTime : a;
  }
  const ceiled = Math.ceil(steps - STEP_EPSILON) * POINT_STEP_SEC;
  const b = ceiled < currentTime ? currentTime : ceiled;
  return duration > 0 ? Math.min(b, Math.max(duration, currentTime)) : b;
}

/**
 * A点またはB点をtimeに設定した新しいABループを返す
 * 設定後にA点がB点以上（区間が逆転・ゼロ幅）になる場合は、Alertで拒否せず反対側をnullにして
 * ループを無効化することで解決する（区間を壊さず、常にどちらかの点だけが残る状態にする）
 * @param abLoop - 現在のABループ設定
 * @param point - 設定する点
 * @param time - 設定する時刻（秒）
 */
export function applyPoint(abLoop: ABLoop, point: "A" | "B", time: number): ABLoop {
  if (point === "A") {
    const invalidatesB = abLoop.pointB !== null && time >= abLoop.pointB;
    return {
      pointA: time,
      pointB: invalidatesB ? null : abLoop.pointB,
      enabled: invalidatesB ? false : abLoop.enabled,
    };
  }
  const invalidatesA = abLoop.pointA !== null && time <= abLoop.pointA;
  return {
    pointA: invalidatesA ? null : abLoop.pointA,
    pointB: time,
    enabled: invalidatesA ? false : abLoop.enabled,
  };
}
