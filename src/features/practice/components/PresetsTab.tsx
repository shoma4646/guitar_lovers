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
import { CATEGORY_LABELS } from "@/features/practice/lib/formatters";
import { useConfirmPhraseSwitch } from "@/features/practice/hooks/useConfirmPhraseSwitch";
import { youtubeThumbnail } from "@/features/practice/lib/youtubeThumbnail";
import { useVideoCardMetrics } from "@/features/practice/hooks/useVideoCardMetrics";

export function PresetsTab() {
  const loadVideo = usePracticeStore((s) => s.loadVideo);
  const { data: presets = [] } = useVideoPresets();
  const confirmSwitch = useConfirmPhraseSwitch();
  const metrics = useVideoCardMetrics();

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
      });
    },
    [confirmSwitch, loadVideo],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {Array.from(grouped, ([category, items]) => (
        <View key={category} className="mb-lg">
          <Text accessibilityRole="header" className="text-label-sm text-on-surface-variant mb-sm">
            {CATEGORY_LABELS[category]}
          </Text>
          <View style={{ gap: 16 }}>
            {items.map((preset) => (
              <Pressable
                key={preset.id}
                onPress={() => handlePlay(preset)}
                className="bg-surface-container-lowest active:opacity-90"
                style={[styles.card, metrics.card, shadowStyle]}
                accessibilityRole="button"
                accessibilityLabel={`${preset.title}を再生`}
              >
                <Image
                  source={{ uri: youtubeThumbnail(preset.videoId) }}
                  resizeMode="cover"
                  style={[styles.thumb, metrics.thumb]}
                />
                <View className="flex-1 min-w-0">
                  <Text
                    testID="preset-title"
                    className="text-on-surface"
                    style={metrics.title}
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
    borderRadius: radius.xl,
  },
  thumb: {
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
  },
  playBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: `${colors.primaryContainer}1A`,
  },
});
