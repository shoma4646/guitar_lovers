import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/shared/constants/colors";
import type { VideoPreset } from "@/shared/types/models";
import { usePracticeStore } from "@/stores/practice";
import { useVideoPresets } from "@/features/practice/api/useVideoPresets";
import { useAddRecentVideo } from "@/features/practice/api/useAddRecentVideo";
import { CATEGORY_LABELS } from "@/features/practice/lib/formatters";

/** プリセットタブ - カテゴリ別動画一覧 */
export function PresetsTab() {
  const loadVideo = usePracticeStore((s) => s.loadVideo);
  const { data: presets = [] } = useVideoPresets();
  const { mutate: addRecent } = useAddRecentVideo();

  const grouped = useMemo(
    () =>
      presets.reduce<Record<string, VideoPreset[]>>((acc, preset) => {
        if (!acc[preset.category]) acc[preset.category] = [];
        acc[preset.category].push(preset);
        return acc;
      }, {}),
    [presets],
  );

  const handlePlay = useCallback(
    (preset: VideoPreset) => {
      loadVideo(preset.videoId, preset.title);
      addRecent({
        videoId: preset.videoId,
        title: preset.title,
        lastWatchedAt: new Date().toISOString(),
      });
    },
    [loadVideo, addRecent],
  );

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {Object.entries(grouped).map(([category, items]) => (
        <View key={category} style={styles.section}>
          <Text style={styles.sectionLabel}>
            {CATEGORY_LABELS[category] ?? category}
          </Text>
          {items.map((preset) => (
            <View key={preset.id} style={styles.card}>
              <View style={styles.thumbnail}>
                <Ionicons name="logo-youtube" size={24} color={colors.error} />
              </View>
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>
                  {preset.title}
                </Text>
                <Text style={styles.category}>
                  {CATEGORY_LABELS[preset.category] ?? preset.category}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handlePlay(preset)}
                style={styles.playBtn}
                accessibilityRole="button"
                accessibilityLabel={`${preset.title}を再生`}
              >
                <Ionicons name="play" size={18} color={colors.textWhite} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 12,
    backgroundColor: colors.bgLightDark,
  },
  thumbnail: {
    width: 50,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgGray,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  category: {
    color: colors.textGray,
    fontSize: 11,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
});
