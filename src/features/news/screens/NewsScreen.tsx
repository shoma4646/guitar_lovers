/**
 * ニュース画面
 * ギター関連のニュース記事をカード形式で一覧表示する。
 * Zod検証済みの静的JSONデータを useNewsArticles で取得する。
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/shared/constants/colors";
import { useNewsArticles } from "@/features/news/api/useNewsArticles";
import { NewsCard } from "@/features/news/components/NewsCard";
import { ErrorBoundary } from "@/shared/components/molecules/ErrorBoundary";

function ListHeader() {
  return (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderTitle}>ギターニュース</Text>
      <Text style={styles.listHeaderSubtitle}>最新情報をチェックしよう</Text>
    </View>
  );
}

function ListEmpty() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>ニュースがありません</Text>
    </View>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

/** ニュース画面コンポーネント */
export function NewsScreen() {
  const { data: articles = [], isFetching, refetch } = useNewsArticles();

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={["bottom"]}>
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
              refreshing={isFetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.bgLightDark}
            />
          }
          ItemSeparatorComponent={ItemSeparator}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listHeader: {
    marginBottom: 16,
    gap: 4,
  },
  listHeaderTitle: {
    color: colors.textWhite,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  listHeaderSubtitle: {
    color: colors.textGray,
    fontSize: 14,
  },
  separator: {
    height: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.textGray,
    fontSize: 16,
  },
});
