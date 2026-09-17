/**
 * ABループカード
 *
 * A点/B点の設定に加え、区間が確定していれば「フレーズとして保存」できる。
 * 保存されたフレーズは今日の練習メニュー（TodayMenuCard）に反復練習対象として現れる。
 */

import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
import { formatDuration } from "@/features/practice/lib/formatters";
import { BPM_MAX, BPM_MIN, clampBpm, isValidBpm } from "@/shared/constants/bpm";
import type { ABLoop } from "@/shared/types/models";
import { cardShadowStyle, cardStyle } from "./cardStyle";

export type SavePhraseInput = {
  name: string;
  currentBpm: number;
  targetBpm: number;
};

type Props = {
  abLoop: ABLoop;
  currentTime: number;
  onSetPointA: () => void;
  onSetPointB: () => void;
  onToggleLoop: () => void;
  onClear: () => void;
  /** フレーズ保存モーダルのBPM初期値（メトロノームの現在BPM） */
  defaultBpm: number;
  onSavePhrase: (input: SavePhraseInput) => void;
};

export function ABLoopCard({
  abLoop,
  currentTime,
  onSetPointA,
  onSetPointB,
  onToggleLoop,
  onClear,
  defaultBpm,
  onSavePhrase,
}: Props) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [name, setName] = useState("");
  const [currentBpm, setCurrentBpm] = useState(String(defaultBpm));
  const [targetBpm, setTargetBpm] = useState(String(clampBpm(defaultBpm + 20)));

  const canSavePhrase =
    abLoop.pointA !== null &&
    abLoop.pointB !== null &&
    abLoop.pointA < abLoop.pointB;

  const openSaveModal = useCallback(() => {
    setName("");
    setCurrentBpm(String(defaultBpm));
    setTargetBpm(String(clampBpm(defaultBpm + 20)));
    setShowSaveModal(true);
  }, [defaultBpm]);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert("エラー", "フレーズの名前を入力してください");
      return;
    }
    const parsedCurrent = parseInt(currentBpm, 10);
    const parsedTarget = parseInt(targetBpm, 10);
    if (!isValidBpm(parsedCurrent)) {
      Alert.alert("エラー", `現在のBPMは${BPM_MIN}〜${BPM_MAX}の範囲で入力してください`);
      return;
    }
    if (!isValidBpm(parsedTarget)) {
      Alert.alert("エラー", `目標BPMは${BPM_MIN}〜${BPM_MAX}の範囲で入力してください`);
      return;
    }
    if (parsedTarget <= parsedCurrent) {
      Alert.alert("エラー", "目標BPMは現在のBPMより大きい値にしてください");
      return;
    }
    onSavePhrase({
      name: name.trim(),
      currentBpm: parsedCurrent,
      targetBpm: parsedTarget,
    });
    setShowSaveModal(false);
  }, [name, currentBpm, targetBpm, onSavePhrase]);

  return (
    <View
      className="bg-surface-container-lowest"
      style={[cardStyle, cardShadowStyle, { marginBottom: 16, gap: 12 }]}
    >
      <Text
        className="text-headline-lg"
        style={{ color: colors.onSurface, fontWeight: "700" }}
      >
        ABループ
      </Text>
      <View className="flex-row" style={{ gap: 8 }}>
        <Pressable
          onPress={onSetPointA}
          className="flex-1 items-center active:opacity-90"
          style={{
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor:
              abLoop.pointA !== null ? colors.primary : colors.surfaceContainer,
          }}
          accessibilityRole="button"
        >
          <Text
            className="text-label-sm"
            style={{
              color:
                abLoop.pointA !== null ? colors.onPrimary : colors.onSurfaceVariant,
              fontWeight: "600",
            }}
          >
            A点 {abLoop.pointA !== null ? `(${formatDuration(abLoop.pointA)})` : "未設定"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onSetPointB}
          className="flex-1 items-center active:opacity-90"
          style={{
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor:
              abLoop.pointB !== null ? colors.primary : colors.surfaceContainer,
          }}
          accessibilityRole="button"
        >
          <Text
            className="text-label-sm"
            style={{
              color:
                abLoop.pointB !== null ? colors.onPrimary : colors.onSurfaceVariant,
              fontWeight: "600",
            }}
          >
            B点 {abLoop.pointB !== null ? `(${formatDuration(abLoop.pointB)})` : "未設定"}
          </Text>
        </Pressable>
      </View>
      <View className="flex-row" style={{ gap: 8 }}>
        <Pressable
          onPress={onToggleLoop}
          disabled={abLoop.pointA === null || abLoop.pointB === null}
          className="flex-1 items-center active:opacity-90"
          style={{
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            backgroundColor: abLoop.enabled
              ? `${colors.secondary}33`
              : colors.surfaceContainerLow,
            borderColor: abLoop.enabled ? colors.secondary : colors.outlineVariant,
          }}
          accessibilityRole="switch"
          accessibilityState={{ checked: abLoop.enabled }}
        >
          <Text
            className="text-label-sm"
            style={{
              color: abLoop.enabled ? colors.secondary : colors.onSurfaceVariant,
              fontWeight: "700",
            }}
          >
            {abLoop.enabled ? "ループON" : "ループOFF"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onClear}
          className="items-center active:opacity-90"
          style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: colors.surfaceContainer,
          }}
          accessibilityRole="button"
        >
          <Text
            className="text-label-sm"
            style={{ color: colors.onSurfaceVariant, fontWeight: "600" }}
          >
            クリア
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={openSaveModal}
        disabled={!canSavePhrase}
        className="flex-row items-center justify-center active:opacity-90"
        style={{
          paddingVertical: 12,
          borderRadius: 12,
          gap: 6,
          opacity: canSavePhrase ? 1 : 0.4,
          backgroundColor: `${colors.tertiaryContainer}33`,
          borderWidth: 1,
          borderColor: colors.tertiary,
        }}
        accessibilityRole="button"
        accessibilityLabel="フレーズとして保存"
      >
        <Icon name="star" size={18} color={colors.tertiary} />
        <Text
          className="text-label-sm"
          style={{ color: colors.tertiary, fontWeight: "700" }}
        >
          フレーズとして保存
        </Text>
      </Pressable>

      <Modal
        visible={showSaveModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSaveModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.overlay}
        >
          <View
            className="bg-surface-container-lowest"
            style={styles.sheet}
          >
            <View className="flex-row items-center justify-between" style={{ marginBottom: 4 }}>
              <Text
                className="text-headline-lg"
                style={{ color: colors.onSurface, fontWeight: "700" }}
              >
                フレーズとして保存
              </Text>
              <Pressable
                onPress={() => setShowSaveModal(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="閉じる"
              >
                <Icon name="close" size={22} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            <Text
              className="text-label-sm"
              style={{ color: colors.onSurfaceVariant, fontWeight: "600" }}
            >
              名前
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceContainerLow, color: colors.onSurface },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="例: 速弾きフレーズ1"
              placeholderTextColor={colors.onSurfaceVariant}
              accessibilityLabel="フレーズ名入力"
            />

            <View className="flex-row" style={{ gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  className="text-label-sm"
                  style={{ color: colors.onSurfaceVariant, fontWeight: "600" }}
                >
                  現在BPM
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surfaceContainerLow, color: colors.onSurface },
                  ]}
                  value={currentBpm}
                  onChangeText={setCurrentBpm}
                  keyboardType="number-pad"
                  accessibilityLabel="現在BPM入力"
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  className="text-label-sm"
                  style={{ color: colors.onSurfaceVariant, fontWeight: "600" }}
                >
                  目標BPM
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surfaceContainerLow, color: colors.onSurface },
                  ]}
                  value={targetBpm}
                  onChangeText={setTargetBpm}
                  keyboardType="number-pad"
                  accessibilityLabel="目標BPM入力"
                />
              </View>
            </View>

            <Pressable
              onPress={handleSave}
              className="items-center active:opacity-90"
              style={{
                height: 48,
                borderRadius: 9999,
                justifyContent: "center",
                marginTop: 4,
                backgroundColor: colors.primary,
              }}
              accessibilityRole="button"
            >
              <Text
                className="text-label-sm"
                style={{ color: colors.onPrimary, fontWeight: "700" }}
              >
                保存する
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  input: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
});
