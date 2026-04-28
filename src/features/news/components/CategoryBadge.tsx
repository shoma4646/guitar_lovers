import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/shared/constants/colors";

/** カテゴリごとの表示スタイル（背景色） */
const CATEGORY_COLORS: Record<string, string> = {
  新製品: colors.primary,
  レビュー: colors.secondary,
  イベント: "#FF9800",
  教則: "#4CAF50",
  アーティスト: "#E91E63",
};

type Props = { category: string };

/** ニュースカテゴリのバッジ */
export function CategoryBadge({ category }: Props) {
  const bgColor = CATEGORY_COLORS[category] ?? colors.bgGray;
  return (
    <View style={[styles.badge, { backgroundColor: bgColor + "CC" }]}>
      <Text style={styles.text}>{category}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  text: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: "700",
  },
});
