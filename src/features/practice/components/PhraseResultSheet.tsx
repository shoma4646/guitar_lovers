/**
 * フレーズ練習結果の記録シート
 *
 * 「今日の練習メニュー」からフレーズ練習を終了したときに表示する。
 * ○（弾けた）/ △（あやしい）/ ×（弾けなかった）と、そのときのBPMを記録する。
 * ○のときはフレーズの現在到達BPMも更新する。
 */

import { useEffect, useState } from "react";
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
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import { BPM_MAX, BPM_MIN, isValidBpm } from "@/shared/constants/bpm";

type Result = PhraseAttempt["result"];

const RESULT_OPTIONS: { key: Result; label: string; icon: "add" | "remove" | "star" }[] = [
  { key: "ok", label: "弾けた", icon: "star" },
  { key: "partial", label: "あやしい", icon: "add" },
  { key: "ng", label: "弾けなかった", icon: "remove" },
];

type Props = {
  visible: boolean;
  phrase: PracticePhrase | null;
  /** 今回の目標BPM。BPM入力欄の初期値として使う */
  todayTargetBpm: number;
  /** 今回弾き終えた回数（1以上なら案内文に表示する） */
  completedReps?: number;
  onClose: () => void;
  onSubmit: (input: { bpm: number; result: Result }) => void;
};

export function PhraseResultSheet({
  visible,
  phrase,
  todayTargetBpm,
  completedReps = 0,
  onClose,
  onSubmit,
}: Props) {
  const [bpmText, setBpmText] = useState(String(todayTargetBpm));
  const [result, setResult] = useState<Result>("ok");

  useEffect(() => {
    if (visible) {
      setBpmText(String(todayTargetBpm));
      setResult("ok");
    }
  }, [visible, todayTargetBpm]);

  if (!phrase) return null;

  const handleSubmit = () => {
    const bpm = parseInt(bpmText, 10);
    if (!isValidBpm(bpm)) {
      Alert.alert("エラー", `BPMは${BPM_MIN}〜${BPM_MAX}の範囲で入力してください`);
      return;
    }
    onSubmit({ bpm, result });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View className="bg-surface-container-lowest" style={styles.sheet}>
          <View className="flex-row items-center justify-between">
            <Text
              className="text-headline-lg"
              style={{ color: colors.onSurface, fontWeight: "700" }}
              numberOfLines={1}
            >
              {phrase.name}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            >
              <Icon name="close" size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <Text
            className="text-body-md"
            style={{ color: colors.onSurfaceVariant }}
          >
            {completedReps > 0
              ? `BPM ${todayTargetBpm}で${completedReps}回弾きました。結果を記録してください`
              : "今日の結果を記録してください"}
          </Text>

          <View className="flex-row" style={{ gap: 8 }}>
            {RESULT_OPTIONS.map((opt) => {
              const active = result === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setResult(opt.key)}
                  className="flex-1 items-center active:opacity-90"
                  style={{
                    paddingVertical: 14,
                    borderRadius: 12,
                    gap: 4,
                    backgroundColor: active
                      ? colors.primary
                      : colors.surfaceContainer,
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Icon
                    name={opt.icon}
                    size={18}
                    color={active ? colors.onPrimary : colors.onSurfaceVariant}
                  />
                  <Text
                    className="text-label-sm"
                    style={{
                      color: active ? colors.onPrimary : colors.onSurfaceVariant,
                      fontWeight: "700",
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text
            className="text-label-sm"
            style={{ color: colors.onSurfaceVariant, fontWeight: "600" }}
          >
            今回のBPM
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surfaceContainerLow, color: colors.onSurface },
            ]}
            value={bpmText}
            onChangeText={setBpmText}
            keyboardType="number-pad"
            accessibilityLabel="今回のBPM入力"
          />

          <Pressable
            onPress={handleSubmit}
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
              記録する
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
