/**
 * プリセットタブ（Stitch modern_6 風）
 *
 * カテゴリ別にカードでプリセット動画を表示する。
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
import { colors, fontSize, radius, shadows } from "@/shared/theme";
import type { VideoPreset } from "@/shared/types/models";
import { usePracticeStore } from "@/stores/practice";
import { useVideoPresets } from "@/features/practice/api/useVideoPresets";
import { useAddRecentVideo } from "@/features/practice/api/useAddRecentVideo";
import { CATEGORY_LABELS } from "@/features/practice/lib/formatters";
import { useConfirmPhraseSwitch } from "@/features/practice/hooks/useConfirmPhraseSwitch";

export function PresetsTab() {
  const loadVideo = usePracticeStore((s) => s.loadVideo);
  const setPracticeSubTab = usePracticeStore((s) => s.setPracticeSubTab);
  const { data: presets = [] } = useVideoPresets();
  const { mutate: addRecent } = useAddRecentVideo();
  const confirmSwitch = useConfirmPhraseSwitch();

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
      confirmSwitch(() => {
        loadVideo(preset.videoId, preset.title);
        addRecent({
          videoId: preset.videoId,
          title: preset.title,
          lastWatchedAt: new Date().toISOString(),
        });
        setPracticeSubTab("practice");
      });
    },
    [confirmSwitch, loadVideo, addRecent, setPracticeSubTab],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {Object.entries(grouped).map(([category, items]) => (
        <View key={category} className="mb-lg">
          <Text className="text-label-sm text-on-surface-variant mb-sm">
            {CATEGORY_LABELS[category] ?? category}
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
                <View className="flex-row items-center" style={{ gap: 16 }}>
                  <View className="flex-1">
                    <Text
                      testID="preset-title"
                      className="text-on-surface mb-1"
                      style={styles.title}
                      numberOfLines={2}
                    >
                      {preset.title}
                    </Text>
                    <Text className="text-on-surface-variant text-body-md">
                      {CATEGORY_LABELS[preset.category] ?? preset.category}
                    </Text>
                  </View>
                  <View
                    className="items-center justify-center"
                    style={{
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
    paddingBottom: 32,
  },
  card: {
    padding: 16,
    borderRadius: radius.xl,
  },
  title: {
    fontSize: fontSize.headingLg,
    fontWeight: "800",
  },
});
