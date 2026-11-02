/**
 * フレーズの整理メニュー（アーカイブ・削除）
 *
 * 今日のフレーズ一覧・全件シート・メニュー集の長押しと読み上げ用アクションで同じ確認フローを使うための共通ロジック。
 */

import { useCallback } from "react";
import { Alert } from "react-native";
import { usePracticeStore } from "@/stores/practice";
import { useArchivePracticePhrase } from "@/features/practice/api/useArchivePracticePhrase";
import { useDeletePracticePhrase } from "@/features/practice/api/useDeletePracticePhrase";
import type { PhraseOrganizeAction } from "@/features/practice/lib/phraseRowLabel";
import type { PracticePhrase } from "@/shared/types/models";

/**
 * フレーズの整理を始めるハンドラを返す
 * actionを省くと長押しのメニューを出し、渡すとメニューを飛ばしてその操作の確認ダイアログを出す
 */
export function usePhraseLongPressActions(): (
  phrase: PracticePhrase,
  action?: PhraseOrganizeAction,
) => void {
  const { mutate: archivePhrase } = useArchivePracticePhrase();
  const { mutate: deletePhrase } = useDeletePracticePhrase();
  const activePhraseId = usePracticeStore(
    (s) => s.activePhrasePractice?.phrase.id ?? null,
  );
  const setActivePhrasePractice = usePracticeStore((s) => s.setActivePhrasePractice);

  // 練習中のフレーズを消したら、結果が消えたフレーズへ記録されないよう練習中状態も解除する
  const clearIfActive = useCallback(
    (phraseId: string) => {
      if (activePhraseId === phraseId) {
        setActivePhrasePractice(null);
      }
    },
    [activePhraseId, setActivePhrasePractice],
  );

  const confirmArchive = useCallback(
    (phrase: PracticePhrase) =>
      Alert.alert(
        "アーカイブの確認",
        `「${phrase.name}」を練習メニューと進捗一覧から外します。記録は残りますが、アプリ内で元に戻す操作は現在ありません。`,
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "アーカイブする",
            onPress: () => archivePhrase(phrase.id, { onSuccess: () => clearIfActive(phrase.id) }),
          },
        ],
      ),
    [archivePhrase, clearIfActive],
  );

  const confirmDelete = useCallback(
    (phrase: PracticePhrase) =>
      Alert.alert("削除の確認", `「${phrase.name}」を削除します。この操作は取り消せません。`, [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除する",
          style: "destructive",
          onPress: () => deletePhrase(phrase.id, { onSuccess: () => clearIfActive(phrase.id) }),
        },
      ]),
    [deletePhrase, clearIfActive],
  );

  return useCallback(
    (phrase: PracticePhrase, action?: PhraseOrganizeAction) => {
      if (action === "archive") return confirmArchive(phrase);
      if (action === "delete") return confirmDelete(phrase);
      Alert.alert(phrase.name, "このフレーズをどうしますか？", [
        { text: "アーカイブ", onPress: () => confirmArchive(phrase) },
        { text: "削除", style: "destructive", onPress: () => confirmDelete(phrase) },
        { text: "キャンセル", style: "cancel" },
      ]);
    },
    [confirmArchive, confirmDelete],
  );
}
