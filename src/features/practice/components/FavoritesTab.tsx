import { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { randomUUID } from "expo-crypto";
import { colors } from "@/shared/constants/colors";
import type { FavoriteVideo, RecentVideo } from "@/shared/types/models";
import { usePracticeStore } from "@/stores/practice";
import { useFavoriteVideos } from "@/features/practice/api/useFavoriteVideos";
import { useRecentVideos } from "@/features/practice/api/useRecentVideos";
import { useToggleFavoriteVideo } from "@/features/practice/api/useToggleFavoriteVideo";

/** お気に入りタブ - 最近視聴した動画とお気に入り */
export function FavoritesTab() {
  const { data: favorites = [] } = useFavoriteVideos();
  const { data: recents = [] } = useRecentVideos();
  const loadVideo = usePracticeStore((s) => s.loadVideo);
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
    },
    [loadVideo],
  );

  const handlePlayFavorite = useCallback(
    (video: FavoriteVideo) => {
      loadVideo(video.videoId, video.title);
    },
    [loadVideo],
  );

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>最近の動画</Text>
        {recents.length === 0 ? (
          <Text style={styles.emptyText}>最近視聴した動画はありません</Text>
        ) : (
          recents.map((video) => {
            const isFav = favorites.some((f) => f.videoId === video.videoId);
            return (
              <View key={video.videoId} style={styles.row}>
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => handlePlayRecent(video)}
                  accessibilityRole="button"
                >
                  <View style={styles.thumb}>
                    <Ionicons
                      name="logo-youtube"
                      size={18}
                      color={colors.error}
                    />
                  </View>
                  <Text style={styles.title} numberOfLines={1}>
                    {video.title}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleToggleFavorite(video)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isFav ? "お気に入りから削除" : "お気に入りに追加"
                  }
                >
                  <Ionicons
                    name={isFav ? "heart" : "heart-outline"}
                    size={20}
                    color={isFav ? colors.error : colors.textGray}
                  />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>お気に入り</Text>
        {favorites.length === 0 ? (
          <Text style={styles.emptyText}>お気に入りはありません</Text>
        ) : (
          favorites.map((video) => (
            <View key={video.videoId} style={styles.row}>
              <TouchableOpacity
                style={styles.rowMain}
                onPress={() => handlePlayFavorite(video)}
                accessibilityRole="button"
              >
                <View style={styles.thumb}>
                  <Ionicons
                    name="logo-youtube"
                    size={18}
                    color={colors.error}
                  />
                </View>
                <Text style={styles.title} numberOfLines={1}>
                  {video.title}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  toggleFavorite({ type: "remove", videoId: video.videoId })
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="お気に入りから削除"
              >
                <Ionicons name="heart" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
  },
  tabScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: colors.textGray,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    gap: 10,
    backgroundColor: colors.bgLightDark,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  thumb: {
    width: 40,
    height: 28,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgGray,
  },
  title: {
    flex: 1,
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyText: {
    color: colors.textGray,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 16,
  },
});
