import type { PitchDetectorStatus } from "@/features/tuner/hooks/usePitchDetector";

/** チューナー画面で画面ロックを抑止するときのタグ */
export const TUNER_KEEP_AWAKE_TAG = "tuner";

/** チューナーで画面の自動ロックを抑止すべきかを返す。マイク入力中のときだけ抑止する */
export function shouldKeepAwakeWhileTuning(status: PitchDetectorStatus): boolean {
  return status === "listening";
}
