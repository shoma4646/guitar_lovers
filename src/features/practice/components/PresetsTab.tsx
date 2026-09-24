/**
 * プリセットタブ（Stitch modern_6 風）
 *
 * カテゴリ別に大型カードでプリセット動画を表示する。
 * - カード: title + category description + 再生ボタン
 * - カテゴリ間にセクションラベルを挟む
 */

import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors, shadows } from "@/shared/theme";
import type { VideoPreset } from "@/shared/types/models";
import { usePracticeStore } from "@/stores/practice";
import { useVideoPresets } from "@/features/practice/api/useVideoPresets";
import { useAddRecentVideo } from "@/features/practice/api/useAddRecentVideo";
import { CATEGORY_LABELS } from "@/features/practice/lib/formatters";

export function PresetsTab() {
  const loadVideo = usePracticeStore((s) => s.loadVideo);
  const setPracticeSubTab = usePracticeStore((s) => s.setPracticeSubTab);
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
      setPracticeSubTab("practice");
    },
    [loadVideo, addRecent, setPracticeSubTab],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {Object.entries(grouped).map(([category, items]) => (
        <View key={category} className="mb-lg">
          <Text className="text-label-sm text-outline mb-sm" style={styles.sectionLabel}>
            {(CATEGORY_LABELS[category] ?? category).toUpperCase()}
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
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-md">
                    <Text
                      className="text-headline-lg text-on-surface mb-1"
                      style={{ fontWeight: "700" }}
                      numberOfLines={2}
                    >
                      {preset.title}
                    </Text>
                    <Text className="text-on-surface-variant text-body-md">
                      {CATEGORY_LABELS[preset.category] ?? preset.category}
                    </Text>
                  </View>
                  <View
                    className="px-sm py-base rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text
                      className="text-label-sm"
                      style={{ color: colors.onPrimary, fontWeight: "600" }}
                    >
                      PRESET
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center mt-md" style={{ gap: 16 }}>
                  <Text
                    className="text-[12px]"
                    style={{ color: colors.outline, fontWeight: "500" }}
                  >
                    Curated routine
                  </Text>
                  <View
                    className="items-center justify-center"
                    style={{
                      marginLeft: "auto",
                      width: 40,
                      height: 40,
                      borderRadius: 9999,
                      backgroundColor: `${colors.primaryContainer}1A`,
                    }}
                  >
                    <Icon name="play_arrow" size={20} color={colors.primary} />
                  </View>
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
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sectionLabel: {
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  card: {
    padding: 20,
    borderRadius: 16,
  },
});
