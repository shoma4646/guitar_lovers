/**
 * お気に入りタブ（Stitch modern_5 風）
 *
 * - サムネ画像（YouTube mqdefault）+ 曲名 + サブ情報 + 星アイコン
 * - 最近視聴したセクション + お気に入りセクション
 */

import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  type AccessibilityActionEvent,
} from "react-native";
import { randomUUID } from "expo-crypto";
import { Icon } from "@/shared/components/atoms/Icon";
import { ReadErrorCard } from "@/shared/components/molecules/ReadErrorCard";
import { hasReadFailure, refetchAll } from "@/shared/lib/readFailure";
import { colors, radius, shadows } from "@/shared/theme";
import type { FavoriteVideo, RecentVideo } from "@/shared/types/models";
import { usePracticeStore } from "@/stores/practice";
import { useFavoriteVideos } from "@/features/practice/api/useFavoriteVideos";
import { useRecentVideos } from "@/features/practice/api/useRecentVideos";
import { useToggleFavoriteVideo } from "@/features/practice/api/useToggleFavoriteVideo";
import { useConfirmPhraseSwitch } from "@/features/practice/hooks/useConfirmPhraseSwitch";
import { formatRelativeVideoDate } from "@/features/practice/lib/relativeVideoDate";
import { youtubeThumbnail } from "@/features/practice/lib/youtubeThumbnail";
import { useVideoCardMetrics } from "@/features/practice/hooks/useVideoCardMetrics";
import { useLocalDay } from "@/shared/hooks/useLocalDay";
import { localDayToDate } from "@/shared/lib/localDay";

const TOGGLE_FAVORITE_ACTION = "toggleFavorite";

/** カードの読み上げ用カスタムアクション（お気に入りの追加・削除） */
function favoriteActions(isFav: boolean) {
  return [{ name: TOGGLE_FAVORITE_ACTION, label: isFav ? "お気に入りから削除" : "お気に入りに追加" }];
}

/** カードのカスタムアクションのうち、お気に入りの切り替えだけを onToggle へ渡す */
function onFavoriteAction(onToggle: () => void) {
  return (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === TOGGLE_FAVORITE_ACTION) onToggle();
  };
}

export function FavoritesTab() {
  const favoritesQuery = useFavoriteVideos();
  const recentsQuery = useRecentVideos();
  const { data: favorites = [] } = favoritesQuery;
  const { data: recents = [] } = recentsQuery;
  const loadVideo = usePracticeStore((s) => s.loadVideo);
  const { mutate: toggleFavorite } = useToggleFavoriteVideo();
  const metrics = useVideoCardMetrics();
  const confirmSwitch = useConfirmPhraseSwitch();
  const localDay = useLocalDay();
  const today = useMemo(() => localDayToDate(localDay), [localDay]);

  const handleToggleFavorite = useCallback(
    (video: RecentVideo) => {
      const isFav = favorites.some((f) => f.videoId === video.videoId);
      if (isFav) {
        toggleFavorite({ type: "remove", videoId: video.videoId });
      } else {
        toggleFavorite({
          type: "add",
          video: {
            id: randomUUID(),
            videoId: video.videoId,
            title: video.title,
            addedAt: new Date().toISOString(),
          },
        });
      }
    },
    [favorites, toggleFavorite],
  );

  const handlePlayRecent = useCallback(
    (video: RecentVideo) => {
      confirmSwitch(() => {
        loadVideo(video.videoId, video.title);
      });
    },
    [confirmSwitch, loadVideo],
  );

  const handlePlayFavorite = useCallback(
    (video: FavoriteVideo) => {
      confirmSwitch(() => {
        loadVideo(video.videoId, video.title);
      });
    },
    [confirmSwitch, loadVideo],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 最近の動画 */}
      <Text accessibilityRole="header" className="text-label-sm text-on-surface-variant mb-sm">
        最近見た動画
      </Text>
      <View style={{ gap: 16 }}>
        {hasReadFailure(recentsQuery) ? (
          <ReadErrorCard title="最近見た動画を読み込めませんでした" onRetry={() => refetchAll(recentsQuery)} />
        ) : recents.length === 0 ? (
          <Text className="text-on-surface-variant text-body-md text-center py-lg">
            最近視聴した動画はありません
          </Text>
        ) : (
          recents.map((video) => {
            const isFav = favorites.some((f) => f.videoId === video.videoId);
            return (
              <Pressable
                key={video.videoId}
                onPress={() => handlePlayRecent(video)}
                className="bg-surface-container-lowest active:opacity-90"
                style={[styles.songCard, metrics.card, shadowStyle]}
                accessibilityRole="button"
                accessibilityLabel={`${video.title}を再生、${formatRelativeVideoDate(video.lastWatchedAt, today)}`}
                accessibilityActions={favoriteActions(isFav)}
                onAccessibilityAction={onFavoriteAction(() => handleToggleFavorite(video))}
              >
                <Image
                  source={{ uri: youtubeThumbnail(video.videoId) }}
                  style={[styles.thumb, metrics.thumb]}
                />
                <View className="flex-1 min-w-0 pr-xl">
                  <Text
                    className="text-on-surface"
                    style={metrics.title}
                    numberOfLines={2}
                  >
                    {video.title}
                  </Text>
                  <Text
                    className="text-label-sm mt-1"
                    style={{ color: colors.onSurfaceVariant, fontWeight: "600" }}
                  >
                    {formatRelativeVideoDate(video.lastWatchedAt, today)}
                  </Text>
                </View>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(video);
                  }}
                  className="active:opacity-70"
                  style={styles.starPosition}
                  accessibilityRole="button"
                  accessibilityLabel={isFav ? "お気に入りから削除" : "お気に入りに追加"}
                >
                  <Icon
                    name="star"
                    size={22}
                    color={isFav ? colors.primary : colors.outline}
                  />
                </Pressable>
              </Pressable>
            );
          })
        )}
      </View>

      {/* お気に入り */}
      <Text accessibilityRole="header" className="text-label-sm text-on-surface-variant mt-xl mb-sm">
        お気に入り
      </Text>
      <View style={{ gap: 16 }}>
        {hasReadFailure(favoritesQuery) ? (
          <ReadErrorCard title="お気に入りを読み込めませんでした" onRetry={() => refetchAll(favoritesQuery)} />
        ) : favorites.length === 0 ? (
          <Text className="text-on-surface-variant text-body-md text-center py-lg">
            お気に入りはありません
          </Text>
        ) : (
          favorites.map((video) => (
            <Pressable
              key={video.videoId}
              onPress={() => handlePlayFavorite(video)}
              className="bg-surface-container-lowest active:opacity-90"
              style={[styles.songCard, metrics.card, shadowStyle]}
              accessibilityRole="button"
              accessibilityLabel={`${video.title}を再生、${formatRelativeVideoDate(video.addedAt, today)}`}
              accessibilityActions={favoriteActions(true)}
              onAccessibilityAction={onFavoriteAction(() =>
                toggleFavorite({ type: "remove", videoId: video.videoId }),
              )}
            >
              <Image
                source={{ uri: youtubeThumbnail(video.videoId) }}
                style={[styles.thumb, metrics.thumb]}
              />
              <View className="flex-1 min-w-0 pr-xl">
                <Text
                  className="text-on-surface"
                  style={metrics.title}
                  numberOfLines={2}
                >
                  {video.title}
                </Text>
                <Text
                  className="text-label-sm mt-1"
                  style={{ color: colors.onSurfaceVariant, fontWeight: "600" }}
                >
                  {formatRelativeVideoDate(video.addedAt, today)}
                </Text>
              </View>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  toggleFavorite({ type: "remove", videoId: video.videoId });
                }}
                className="active:opacity-70"
                style={styles.starPosition}
                accessibilityRole="button"
                accessibilityLabel="お気に入りから削除"
              >
                <Icon name="star" size={22} color={colors.primary} />
              </Pressable>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const shadowStyle = {
  ...shadows.layered,
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
  },
  songCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.xl,
    position: "relative",
  },
  thumb: {
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
  },
  starPosition: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
