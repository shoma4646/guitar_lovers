/**
 * チューナー判定のスクリーンリーダー告知
 *
 * 判定（弦番号＋低い／合っている／高い）が切り替わったときと、弦が合ったときにだけ
 * 告知文言を返す純関数。告知の間引きや実際の読み上げは画面側が担う。
 */

import { describeTuning, type TuningState } from "@/features/tuner/lib/meter";

/** 今回の判定。音を拾っていないときは null */
export type TuningJudgement = {
  stringNumber: number;
  state: TuningState;
  /** その弦がチューニング完了済みか */
  tuned: boolean;
};

/** これまでに告知した内容の記録 */
export type AnnouncementMemory = {
  last: { stringNumber: number; state: TuningState } | null;
  /** 「合いました」を告知済みの弦番号 */
  tunedAnnounced: readonly number[];
};

export const INITIAL_ANNOUNCEMENT_MEMORY: AnnouncementMemory = { last: null, tunedAnnounced: [] };

export type TuningAnnouncement = {
  /** 告知する文言。告知しないときは null */
  text: string | null;
  /** 弦が合ったことの告知か（間引かずにすぐ読む） */
  isTuned: boolean;
  /** 告知後（または告知なしで更新した後）の記録 */
  memory: AnnouncementMemory;
};

/** 弦番号を読み上げ用のラベルにする（例: 6 → "6弦"） */
function stringLabel(stringNumber: number): string {
  return `${stringNumber}弦`;
}

/**
 * 前回までの告知記録と今回の判定から、告知する文言を決める
 * - 同じ弦・同じ状態が続く間は告知しない
 * - 未完了の弦が許容範囲に入っただけでは告知せず、完了したときに「◯弦: 合いました」を弦ごとに1回だけ告知する
 * - それ以外で弦か状態が変わったら弦番号付きの判定を告知する
 */
export function nextTuningAnnouncement(
  memory: AnnouncementMemory,
  judgement: TuningJudgement | null,
): TuningAnnouncement {
  const none = (next: AnnouncementMemory = memory): TuningAnnouncement => ({
    text: null,
    isTuned: false,
    memory: next,
  });
  if (judgement === null) return none();

  const { stringNumber, state, tuned } = judgement;
  const tunedAnnounced = tuned
    ? memory.tunedAnnounced
    : memory.tunedAnnounced.filter((n) => n !== stringNumber);
  const synced: AnnouncementMemory =
    tunedAnnounced === memory.tunedAnnounced ? memory : { ...memory, tunedAnnounced };

  if (tuned && state === "in" && !synced.tunedAnnounced.includes(stringNumber)) {
    return {
      text: `${stringLabel(stringNumber)}: 合いました`,
      isTuned: true,
      memory: {
        last: { stringNumber, state },
        tunedAnnounced: [...synced.tunedAnnounced, stringNumber],
      },
    };
  }

  if (state === "in" && !tuned) return none(synced);

  if (synced.last?.stringNumber === stringNumber && synced.last.state === state) return none(synced);

  return {
    text: describeTuning(state, stringLabel(stringNumber)),
    isTuned: false,
    memory: { ...synced, last: { stringNumber, state } },
  };
}
