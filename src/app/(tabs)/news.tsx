/**
 * ニュース画面
 * ギター関連のニュース記事をカード形式で一覧表示する。
 * JSONアセットからデータを読み込み、プルトゥリフレッシュで再描画する。
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/shared/constants/colors";
import type { NewsArticle } from "@/shared/types/models";

/** ニュースデータをアセットから読み込む */
const newsData: NewsArticle[] = require("../../../assets/json/news.json");

/** カテゴリごとの表示スタイル（背景色） */
const CATEGORY_COLORS: Record<string, string> = {
  新製品: colors.primary,
  レビュー: colors.secondary,
  イベント: "#FF9800",
  教則: "#4CAF50",
  アーティスト: "#E91E63",
};

/**
 * "YYYY-MM-DD" 形式の日付を "YYYY年M月D日" に変換する
 */
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

// ============================================================
// サブコンポーネント: カテゴリバッジ
// ============================================================

interface CategoryBadgeProps {
  category: string;
}

/**
 * カテゴリバッジコンポーネント
 */
function CategoryBadge({ category }: CategoryBadgeProps) {
  const bgColor = CATEGORY_COLORS[category] ?? colors.bgGray;
  return (
    <View style={[styles.badge, { backgroundColor: bgColor + "CC" }]}>
      <Text style={[styles.badgeText, { color: colors.textWhite }]}>
        {category}
      </Text>
    </View>
  );
}

// ============================================================
// サブコンポーネント: ニュースカード
// ============================================================

interface NewsCardProps {
  article: NewsArticle;
}

/**
 * ニュース記事カードコンポーネント
 */
function NewsCard({ article }: NewsCardProps) {
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
      style={[styles.card, { backgroundColor: colors.bgLightDark }]}
      activeOpacity={article.url ? 0.75 : 1}
      accessibilityRole={article.url ? "link" : "text"}
      accessibilityLabel={article.title}
    >
      {/* サムネイル画像 */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: article.image }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={`${article.title}のサムネイル`}
        />
        {/* カテゴリバッジ（画像の左上に重ねる） */}
        <View style={styles.badgeOverlay}>
          <CategoryBadge category={article.category} />
        </View>
      </View>

      {/* 記事情報 */}
      <View style={styles.cardBody}>
        {/* 日付 */}
        <Text style={[styles.date, { color: colors.textGray }]}>
          {formatDate(article.date)}
        </Text>

        {/* タイトル */}
        <Text
          style={[styles.title, { color: colors.textWhite }]}
          numberOfLines={2}
        >
          {article.title}
        </Text>

        {/* 抜粋 */}
        <Text
          style={[styles.excerpt, { color: colors.textGray }]}
          numberOfLines={2}
        >
          {article.excerpt}
        </Text>

        {/* 続きを読むリンク */}
        {article.url && (
          <Text style={[styles.readMore, { color: colors.primary }]}>
            続きを読む
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================
// メイン画面コンポーネント
// ============================================================

/**
 * ニュース画面コンポーネント
 */
export default function NewsScreen() {
  const [articles, setArticles] = useState<NewsArticle[]>(newsData);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * プルトゥリフレッシュハンドラ
   * 実際のAPIがない場合は再レンダリングのみ行う
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // 実際のAPIが用意されたらここでフェッチする
    // 現在はJSONアセットを再読み込みするだけ
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    setArticles([...newsData]);
    setRefreshing(false);
  }, []);

  /**
   * FlatListのヘッダーコンポーネント
   */
  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <Text style={[styles.listHeaderTitle, { color: colors.textWhite }]}>
          ギターニュース
        </Text>
        <Text
          style={[styles.listHeaderSubtitle, { color: colors.textGray }]}
        >
          最新情報をチェックしよう
        </Text>
      </View>
    ),
    []
  );

  /**
   * FlatListの空状態コンポーネント
   */
  const ListEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: colors.textGray }]}>
          ニュースがありません
        </Text>
      </View>
    ),
    []
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgDark }]}
      edges={["bottom"]}
    >
      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NewsCard article={item} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.bgLightDark}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  // リストヘッダー
  listHeader: {
    marginBottom: 16,
    gap: 4,
  },
  listHeaderTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  listHeaderSubtitle: {
    fontSize: 14,
  },
  // カード
  card: {
    borderRadius: 16,
    overflow: "hidden",
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  date: {
    fontSize: 11,
    fontWeight: "500",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  excerpt: {
    fontSize: 13,
    lineHeight: 19,
  },
  readMore: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  // セパレーター
  separator: {
    height: 12,
  },
  // 空状態
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});
