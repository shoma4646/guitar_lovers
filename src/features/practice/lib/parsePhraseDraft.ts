import { BPM_MAX, BPM_MIN, isValidBpm } from "@/shared/constants/bpm";

/** フレーズ保存シートが確定させる入力値 */
export type SavePhraseInput = {
  name: string;
  currentBpm: number;
  targetBpm: number;
};

/** フレーズ保存シートの未検証の入力値（テキスト入力そのまま） */
export type PhraseDraft = {
  name: string;
  currentBpm: string;
  targetBpm: string;
};

export type ParsePhraseDraftResult =
  | { ok: true; value: SavePhraseInput }
  | { ok: false; error: string };

/** 入力値を検証し、保存できる値か利用者向けのエラーメッセージを返す */
export function parsePhraseDraft(draft: PhraseDraft): ParsePhraseDraftResult {
  const name = draft.name.trim();
  if (!name) {
    return { ok: false, error: "フレーズの名前を入力してください" };
  }
  const currentBpm = parseInt(draft.currentBpm, 10);
  const targetBpm = parseInt(draft.targetBpm, 10);
  if (!isValidBpm(currentBpm)) {
    return { ok: false, error: `現在のBPMは${BPM_MIN}〜${BPM_MAX}の範囲で入力してください` };
  }
  if (!isValidBpm(targetBpm)) {
    return { ok: false, error: `目標BPMは${BPM_MIN}〜${BPM_MAX}の範囲で入力してください` };
  }
  if (targetBpm <= currentBpm) {
    return { ok: false, error: "目標BPMは現在のBPMより大きい値にしてください" };
  }
  return { ok: true, value: { name, currentBpm, targetBpm } };
}
