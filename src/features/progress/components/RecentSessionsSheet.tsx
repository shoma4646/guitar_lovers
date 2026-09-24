/**
 * 最近の記録シート
 *
 * 練習セッションの全件表示・手動追加・削除（既存SessionRowの長押し）をこのシートへ集約する。
 * 画面本体のFABは廃止し、導線をここへ一本化した。
 */

import { ScrollView, View, Text, StyleSheet } from "react-native";
import { BottomSheet } from "@/shared/components/molecules/BottomSheet";
import { Button } from "@/shared/components/atoms/Button";
import { colors } from "@/shared/theme";
import type { PracticeSession } from "@/shared/types/models";
import { SessionRow } from "@/features/progress/components/SessionRow";

type Props = {
  visible: boolean;
  onClose: () => void;
  sessions: PracticeSession[];
  onDelete: (id: string) => void | Promise<void>;
  onAddPress: () => void;
};

export function RecentSessionsSheet({ visible, onClose, sessions, onDelete, onAddPress }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={`最近の記録（${sessions.length}件）`}>
      <Button
        label="記録を手動で追加"
        variant="tonal"
        onPress={onAddPress}
        fullWidth
        style={styles.addButton}
      />
      {sessions.length === 0 ? (
        <Text style={styles.empty}>練習記録がありません</Text>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.list}>
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} onDelete={onDelete} />
            ))}
          </View>
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  addButton: {
    marginTop: 12,
    marginBottom: 8,
  },
  empty: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    paddingVertical: 24,
  },
  scroll: {
    maxHeight: 420,
  },
  list: {
    gap: 12,
    paddingVertical: 8,
    paddingBottom: 16,
  },
});
