import { useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import { colors } from "@/shared/constants/colors";
import type { NewsArticle } from "@/shared/types/models";
import { CategoryBadge } from "./CategoryBadge";

/** "YYYY-MM-DD" 形式の日付を "YYYY年M月D日" に変換する */
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

type Props = { article: NewsArticle };

/** ニュース記事カード */
export function NewsCard({ article }: Props) {
  const handlePress = useCallback(() => {
    if (article.url) {
      Linking.openURL(article.url).catch(() => {
        Alert.alert("エラー", "リンクを開けませんでした");
      });
    }
  }, [article.url]);

  return (
    <TouchableOpacity
      onPress={article.url ? handlePress : undefined}
      style={styles.card}
      activeOpacity={article.url ? 0.75 : 1}
      accessibilityRole={article.url ? "link" : "text"}
      accessibilityLabel={article.title}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: article.image }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={`${article.title}のサムネイル`}
        />
        <View style={styles.badgeOverlay}>
          <CategoryBadge category={article.category} />
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.date}>{formatDate(article.date)}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {article.title}
        </Text>
        <Text style={styles.excerpt} numberOfLines={2}>
          {article.excerpt}
        </Text>
        {article.url && <Text style={styles.readMore}>続きを読む</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.bgLightDark,
  },
  imageContainer: {
    position: "relative",
    height: 180,
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.bgGray,
  },
  badgeOverlay: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  date: {
    color: colors.textGray,
    fontSize: 11,
    fontWeight: "500",
  },
  title: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  excerpt: {
    color: colors.textGray,
    fontSize: 13,
    lineHeight: 19,
  },
  readMore: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
});
