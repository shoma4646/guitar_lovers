/**
 * セッション一覧の行（Stitch modern_2 風）
 *
 * - 左: 角丸アイコンタイル（primary 色アイコン）
 * - 中央: タイトル（日付）+ サブ（notes or 種別）
 * - 右: 練習時間 + 相対日付
 * - 長押し、またはスクリーンリーダーの「削除」アクションで削除確認ダイアログ
 */

import { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  type AccessibilityActionEvent,
} from "react-native";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors, shadows } from "@/shared/theme";
import type { PracticeSession } from "@/shared/types/models";
import {
  formatDateShort,
  formatDurationLong,
  formatDurationShort,
} from "@/features/progress/lib/formatters";
import { formatRelativeDay } from "@/features/progress/lib/relativeDay";

const DELETE_ACTION = "delete";

function buildAccessibilityLabel(
  session: PracticeSession,
  relativeDay: string,
): string {
  const date = new Date(session.date);
  const dateLabel = `${date.getMonth() + 1}月${date.getDate()}日`;
  const isNamedDay = relativeDay !== formatDateShort(session.date);
  return [
    isNamedDay ? `${dateLabel}（${relativeDay}）` : dateLabel,
    `練習${formatDurationLong(session.duration)}`,
    session.notes ? `メモ ${session.notes}` : null,
  ]
    .filter(Boolean)
    .join("、");
}

type Props = {
  session: PracticeSession;
  onDelete: (id: string) => void | Promise<void>;
};

export function SessionRow({ session, onDelete }: Props) {
  const relativeDay = formatRelativeDay(session.date, new Date());

  const confirmDelete = useCallback(() => {
    Alert.alert("削除確認", "この練習記録を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => onDelete(session.id),
      },
    ]);
  }, [session.id, onDelete]);

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === DELETE_ACTION) confirmDelete();
    },
    [confirmDelete],
  );

  return (
    <Pressable
      onLongPress={confirmDelete}
      delayLongPress={500}
      className="bg-surface-container-lowest active:opacity-90"
      style={[styles.row, shadowStyle]}
      accessible
      accessibilityLabel={buildAccessibilityLabel(session, relativeDay)}
      accessibilityActions={[{ name: DELETE_ACTION, label: "削除" }]}
      onAccessibilityAction={handleAccessibilityAction}
    >
      <View
        style={[
          styles.iconTile,
          { backgroundColor: colors.surfaceContainerHighest },
        ]}
      >
        <Icon name="music_note" size={20} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text
          className="text-body-lg"
          style={{ color: colors.onSurface, fontWeight: "700" }}
          numberOfLines={1}
        >
          {formatDateShort(session.date)}
        </Text>
        {session.notes ? (
          <Text
            className="text-label-sm"
            style={{ color: colors.onSurfaceVariant, fontWeight: "600", marginTop: 2 }}
            numberOfLines={1}
          >
            {session.notes}
          </Text>
        ) : (
          <Text
            className="text-label-sm"
            style={{ color: colors.onSurfaceVariant, fontWeight: "600", marginTop: 2 }}
          >
            練習
          </Text>
        )}
      </View>
      <View style={styles.rightCol}>
        <Text
          className="text-body-md"
          style={{
            color: colors.onSurface,
            fontWeight: "700",
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatDurationShort(session.duration)}
        </Text>
        <Text
          className="text-label-sm"
          style={{ color: colors.onSurfaceVariant, fontWeight: "600", marginTop: 2 }}
        >
          {relativeDay}
        </Text>
      </View>
    </Pressable>
  );
}

const shadowStyle = {
  ...shadows.layered,
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  rightCol: {
    alignItems: "flex-end",
  },
});
