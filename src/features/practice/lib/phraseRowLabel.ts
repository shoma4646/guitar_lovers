import type { TodayMenuEntry } from "@/features/practice/lib/progression";

/**
 * 今日のフレーズ行・全件シートの行の読み上げラベルを作る
 * 例:「卒業済み、イントロ、前回112、今日の目標117BPM、今日完了120BPM」
 * @param entry - 今日の練習メニューの1行
 * @param currentBpm - 前回までの到達BPM
 */
export function buildPhraseRowLabel(entry: TodayMenuEntry, currentBpm: number): string {
  const { today } = entry;
  const parts = [entry.phrase.name, `前回${currentBpm}`, `今日の目標${today.targetBeforeToday}BPM`];
  if (entry.priority === "graduated") parts.unshift("卒業済み");
  if (today.reached && today.todayBestOkBpm !== undefined) parts.push(`今日完了${today.todayBestOkBpm}BPM`);
  return parts.join("、");
}

/** フレーズ行の操作の説明（読み上げのヒント） */
export const PHRASE_ROW_HINT = "タップで練習を開始。長押しでアーカイブ・削除";
