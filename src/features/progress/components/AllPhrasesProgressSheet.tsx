/**
 * フレーズの上達 全件シート
 *
 * 画面本体では上限4件までしか出せない上達中／卒業フレーズを、上限なしで一覧表示する。
 */

import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { BottomSheet } from "@/shared/components/molecules/BottomSheet";
import { SegmentedControl, type SegmentedItem } from "@/shared/components/atoms/SegmentedControl";
import { semantic } from "@/shared/theme/semantic";
import { PhraseProgressList } from "@/features/progress/components/PhraseProgressList";
import { GraduatedPhraseList } from "@/features/progress/components/GraduatedPhraseList";
import type {
  GraduatedPhraseSummary,
} from "@/features/progress/hooks/usePhraseProgressSummaries";
import type { PhraseProgressSummary } from "@/features/progress/lib/phraseProgress";

type PhraseKind = "active" | "graduated";

type Props = {
  visible: boolean;
  onClose: () => void;
  inProgress: PhraseProgressSummary[];
  graduated: GraduatedPhraseSummary[];
  /** 開いたときに表示するセグメント（画面側で選択中だった方を引き継ぐ） */
  initialKind: PhraseKind;
};

export function AllPhrasesProgressSheet({
  visible,
  onClose,
  inProgress,
  graduated,
  initialKind,
}: Props) {
  const [kind, setKind] = useState<PhraseKind>(initialKind);

  const items: SegmentedItem<PhraseKind>[] = [
    { value: "active", label: "上達中", suffix: `${inProgress.length}` },
    {
      value: "graduated",
      label: "卒業",
      suffix: `${graduated.length}`,
      suffixColor: semantic.graduated,
    },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="フレーズの上達">
      <SegmentedControl
        items={items}
        value={kind}
        onChange={setKind}
        role="tab"
        accessibilityLabel="進捗の種類"
      />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {kind === "active" ? (
          <PhraseProgressList items={inProgress} />
        ) : (
          <GraduatedPhraseList items={graduated} />
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 420,
    marginTop: 12,
  },
});
