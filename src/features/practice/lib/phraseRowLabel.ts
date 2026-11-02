import type { AccessibilityActionEvent } from "react-native";
import type { TodayMenuEntry } from "@/features/practice/lib/progression";

/**
 * 今日のフレーズ行・全件シート・メニュー集の行の読み上げラベルを作る
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

/** フレーズ行の整理操作（アーカイブ・削除） */
export type PhraseOrganizeAction = "archive" | "delete";

/** フレーズ行に付ける読み上げ用アクション。長押しと同じ整理操作を読み上げ操作から呼べるようにする */
export const PHRASE_ROW_ACCESSIBILITY_ACTIONS: { name: PhraseOrganizeAction; label: string }[] = [
  { name: "archive", label: "アーカイブ" },
  { name: "delete", label: "削除" },
];

/**
 * フレーズ行のPressableに渡す読み上げ用アクションのprops
 * @param onOrganize - アーカイブ・削除のアクションが実行されたときに呼ぶ
 */
export function phraseRowAccessibilityActionProps(onOrganize: (action: PhraseOrganizeAction) => void) {
  return {
    accessibilityActions: PHRASE_ROW_ACCESSIBILITY_ACTIONS,
    onAccessibilityAction: (event: AccessibilityActionEvent) => {
      const action = PHRASE_ROW_ACCESSIBILITY_ACTIONS.find(
        (a) => a.name === event.nativeEvent.actionName,
      )?.name;
      if (action) onOrganize(action);
    },
  };
}
