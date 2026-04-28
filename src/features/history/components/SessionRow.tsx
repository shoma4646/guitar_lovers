import { useCallback } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/shared/constants/colors";
import type { PracticeSession } from "@/shared/types/models";
import {
  formatDateShort,
  formatDurationShort,
} from "@/features/history/lib/formatters";

type Props = {
  session: PracticeSession;
  onDelete: (id: string) => void;
};

/** セッション一覧の行コンポーネント。長押しで削除ダイアログを表示する */
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
    <TouchableOpacity
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={styles.row}
      accessibilityRole="button"
      accessibilityHint="長押しで削除"
    >
      <View style={styles.iconWrap}>
        <Ionicons name="musical-notes" size={18} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.date}>{formatDateShort(session.date)}</Text>
        {session.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {session.notes}
          </Text>
        ) : null}
      </View>
      <Text style={styles.duration}>
        {formatDurationShort(session.duration)}
      </Text>
      <TouchableOpacity
        onPress={handleLongPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="削除"
      >
        <Ionicons name="trash-outline" size={18} color={colors.textGray} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    backgroundColor: colors.bgLightDark,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "22",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  date: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: "600",
  },
  notes: {
    color: colors.textGray,
    fontSize: 12,
  },
  duration: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
