/**
 * プリセットタブ（Stitch modern_6 風）
 *
 * カテゴリ別にカードでプリセット動画を表示する。
 * - カード: お気に入りタブと同じサムネ + タイトル（2行まで）+ 再生アイコン
 * - カテゴリ名はセクションラベルにだけ出す
 */

import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors, radius, shadows } from "@/shared/theme";
import type { PresetCategory, VideoPreset } from "@/shared/types/models";
import { usePracticeStore } from "@/stores/practice";
import { useVideoPresets } from "@/features/practice/api/useVideoPresets";
import { useAddRecentVideo } from "@/features/practice/api/useAddRecentVideo";
import { CATEGORY_LABELS } from "@/features/practice/lib/formatters";
import { useConfirmPhraseSwitch } from "@/features/practice/hooks/useConfirmPhraseSwitch";
import { youtubeThumbnail } from "@/features/practice/lib/youtubeThumbnail";

export function PresetsTab() {
  const loadVideo = usePracticeStore((s) => s.loadVideo);
  const { data: presets = [] } = useVideoPresets();
  const { mutate: addRecent } = useAddRecentVideo();
  const confirmSwitch = useConfirmPhraseSwitch();

  const grouped = useMemo(
    () =>
      presets.reduce((acc, preset) => {
        const items = acc.get(preset.category) ?? [];
        items.push(preset);
        acc.set(preset.category, items);
        return acc;
      }, new Map<PresetCategory, VideoPreset[]>()),
    [presets],
  );

  const handlePlay = useCallback(
    (preset: VideoPreset) => {
      confirmSwitch(() => {
        loadVideo(preset.videoId, preset.title);
        addRecent({
          videoId: preset.videoId,
          title: preset.title,
          lastWatchedAt: new Date().toISOString(),
        });
      });
    },
    [confirmSwitch, loadVideo, addRecent],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {Array.from(grouped, ([category, items]) => (
        <View key={category} className="mb-lg">
          <Text className="text-label-sm text-on-surface-variant mb-sm">
            {CATEGORY_LABELS[category]}
          </Text>
          <View style={{ gap: 16 }}>
            {items.map((preset) => (
              <Pressable
                key={preset.id}
                onPress={() => handlePlay(preset)}
                className="bg-surface-container-lowest active:opacity-90"
                style={[styles.card, shadowStyle]}
                accessibilityRole="button"
                accessibilityLabel={`${preset.title}を再生`}
              >
                <Image source={{ uri: youtubeThumbnail(preset.videoId) }} style={styles.thumb} />
                <View className="flex-1 min-w-0">
                  <Text
                    testID="preset-title"
                    className="text-on-surface"
                    style={styles.title}
                    numberOfLines={2}
                  >
                    {preset.title}
                  </Text>
                </View>
                <View className="items-center justify-center" style={styles.playBadge}>
                  <Icon name="play_arrow" size={20} color={colors.primary} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      {presets.length === 0 && (
        <Text className="text-on-surface-variant text-body-md text-center py-lg">
          プリセットがありません
        </Text>
      )}
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: radius.xl,
    gap: 16,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  playBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: `${colors.primaryContainer}1A`,
  },
});
