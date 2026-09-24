/**
 * お気に入りタブ（Stitch modern_5 風）
 *
 * - サムネ画像（YouTube mqdefault）+ 曲名 + サブ情報 + 星アイコン
 * - 最近視聴したセクション + お気に入りセクション
 */

import { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { randomUUID } from "expo-crypto";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors, shadows } from "@/shared/theme";
import type { FavoriteVideo, RecentVideo } from "@/shared/types/models";
import { usePracticeStore } from "@/stores/practice";
import { useFavoriteVideos } from "@/features/practice/api/useFavoriteVideos";
import { useRecentVideos } from "@/features/practice/api/useRecentVideos";
import { useToggleFavoriteVideo } from "@/features/practice/api/useToggleFavoriteVideo";

function youtubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "今日";
  if (days === 1) return "昨日";
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週前`;
  return `${Math.floor(days / 30)}ヶ月前`;
}

export function FavoritesTab() {
  const { data: favorites = [] } = useFavoriteVideos();
  const { data: recents = [] } = useRecentVideos();
  const loadVideo = usePracticeStore((s) => s.loadVideo);
  const setPracticeSubTab = usePracticeStore((s) => s.setPracticeSubTab);
  const { mutateAsync: toggleFavorite } = useToggleFavoriteVideo();

  const handleToggleFavorite = useCallback(
    async (video: RecentVideo) => {
      const isFav = favorites.some((f) => f.videoId === video.videoId);
      if (isFav) {
        await toggleFavorite({ type: "remove", videoId: video.videoId });
      } else {
        await toggleFavorite({
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
      loadVideo(video.videoId, video.title);
      setPracticeSubTab("practice");
    },
    [loadVideo, setPracticeSubTab],
  );

  const handlePlayFavorite = useCallback(
    (video: FavoriteVideo) => {
      loadVideo(video.videoId, video.title);
      setPracticeSubTab("practice");
    },
    [loadVideo, setPracticeSubTab],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 最近の動画 */}
      <Text className="text-label-sm text-outline mb-sm" style={styles.sectionLabel}>
        RECENT
      </Text>
      <View style={{ gap: 16 }}>
        {recents.length === 0 ? (
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
                style={[styles.songCard, shadowStyle]}
              >
                <Image
                  source={{ uri: youtubeThumbnail(video.videoId) }}
                  style={styles.thumb}
                />
                <View className="flex-1 min-w-0 pr-xl">
                  <Text
                    className="text-on-surface"
                    style={{ fontSize: 18, fontWeight: "700", lineHeight: 22 }}
                    numberOfLines={2}
                  >
                    {video.title}
                  </Text>
                  <Text
                    className="text-label-sm mt-1"
                    style={{ color: colors.onSurfaceVariant, fontWeight: "600" }}
                  >
                    {formatRelative(video.lastWatchedAt)}
                  </Text>
                  <View className="flex-row mt-xs" style={{ gap: 8 }}>
                    <View style={[styles.badge, { backgroundColor: colors.surfaceContainer }]}>
                      <Text style={[styles.badgeText, { color: colors.onSurfaceVariant }]}>
                        YOUTUBE
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    void handleToggleFavorite(video);
                  }}
                  hitSlop={8}
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
      <Text className="text-label-sm text-outline mt-xl mb-sm" style={styles.sectionLabel}>
        FAVORITES
      </Text>
      <View style={{ gap: 16 }}>
        {favorites.length === 0 ? (
          <Text className="text-on-surface-variant text-body-md text-center py-lg">
            お気に入りはありません
          </Text>
        ) : (
          favorites.map((video) => (
            <Pressable
              key={video.videoId}
              onPress={() => handlePlayFavorite(video)}
              className="bg-surface-container-lowest active:opacity-90"
              style={[styles.songCard, shadowStyle]}
            >
              <Image
                source={{ uri: youtubeThumbnail(video.videoId) }}
                style={styles.thumb}
              />
              <View className="flex-1 min-w-0 pr-xl">
                <Text
                  className="text-on-surface"
                  style={{ fontSize: 18, fontWeight: "700", lineHeight: 22 }}
                  numberOfLines={2}
                >
                  {video.title}
                </Text>
                <Text
                  className="text-label-sm mt-1"
                  style={{ color: colors.onSurfaceVariant, fontWeight: "600" }}
                >
                  {formatRelative(video.addedAt)}
                </Text>
              </View>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  void toggleFavorite({ type: "remove", videoId: video.videoId });
                }}
                hitSlop={8}
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
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sectionLabel: {
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  songCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 16,
    position: "relative",
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#f6ddda",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  starPosition: {
    position: "absolute",
    top: 12,
    right: 12,
  },
});
