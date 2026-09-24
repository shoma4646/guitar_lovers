/**
 * セッション一覧の行（Stitch modern_2 風）
 *
 * - 左: 角丸アイコンタイル（primary 色アイコン）
 * - 中央: タイトル（日付）+ サブ（notes or 種別）
 * - 右: 練習時間 + 相対日付
 * - 長押しで削除確認ダイアログ
 */

import { useCallback } from "react";
import { View, Text, Pressable, Alert, StyleSheet } from "react-native";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors, shadows } from "@/shared/theme";
import type { PracticeSession } from "@/shared/types/models";
import {
  formatDateShort,
  formatDurationShort,
} from "@/features/progress/lib/formatters";

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return formatDateShort(iso);
}

type Props = {
  session: PracticeSession;
  onDelete: (id: string) => void | Promise<void>;
};

export function SessionRow({ session, onDelete }: Props) {
  const handleLongPress = useCallback(() => {
    Alert.alert("削除確認", "この練習記録を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => onDelete(session.id),
      },
    ]);
  }, [session.id, onDelete]);

  return (
    <Pressable
      onLongPress={handleLongPress}
      delayLongPress={500}
      className="bg-surface-container-lowest active:opacity-90"
      style={[styles.row, shadowStyle]}
      accessibilityRole="button"
      accessibilityHint="長押しで削除"
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
            style={{ color: colors.outlineVariant, fontWeight: "600", marginTop: 2 }}
            numberOfLines={1}
          >
            {session.notes}
          </Text>
        ) : (
          <Text
            className="text-label-sm"
            style={{ color: colors.outlineVariant, fontWeight: "600", marginTop: 2 }}
          >
            Practice Session
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
          style={{ color: colors.outlineVariant, fontWeight: "600", marginTop: 2 }}
        >
          {formatRelative(session.date)}
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
