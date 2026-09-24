import type { ABLoop } from "@/shared/types/models";

/**
 * A点とB点が両方設定され、B点がA点より後にあるか
 * ループの有効化・解除ボタンの活性判定と、フレーズ保存の可否判定の両方で使う
 * @param abLoop - 対象のABループ設定
 */
export function isValidLoopRange(abLoop: Pick<ABLoop, "pointA" | "pointB">): boolean {
  return abLoop.pointA !== null && abLoop.pointB !== null && abLoop.pointA < abLoop.pointB;
}

/**
 * B点到達によるA点への巻き戻しが必要かを判定する
 * ドラッグ中に呼ぶと再生位置がユーザー操作と競合するため、呼び出し側でドラッグ中は判定自体をスキップすること
 * @param currentTime - 現在の再生位置（秒）
 * @param abLoop - 対象のABループ設定
 */
export function shouldLoopBack(currentTime: number, abLoop: ABLoop): boolean {
  return (
    abLoop.enabled &&
    abLoop.pointA !== null &&
    abLoop.pointB !== null &&
    currentTime >= abLoop.pointB
  );
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
