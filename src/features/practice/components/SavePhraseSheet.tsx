/**
 * 区間をフレーズとして保存するシート
 *
 * PracticeControlPanelの「この区間を新しいフレーズにする」から開く。
 * 保存されたフレーズは今日の練習メニュー（TodayPickCard / TodayPhraseRows）に反復練習対象として現れる。
 */

import { useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { BottomSheet } from "@/shared/components/molecules/BottomSheet";
import { Button } from "@/shared/components/atoms/Button";
import { colors, radius } from "@/shared/theme";
import { BPM_MAX, BPM_MIN, clampBpm, isValidBpm } from "@/shared/constants/bpm";

export type SavePhraseInput = {
  name: string;
  currentBpm: number;
  targetBpm: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** シートを開いた時点のBPM初期値（メトロノームの現在BPM） */
  defaultBpm: number;
  onSave: (input: SavePhraseInput) => void;
};

export function SavePhraseSheet({ visible, onClose, defaultBpm, onSave }: Props) {
  const [name, setName] = useState("");
  const [currentBpm, setCurrentBpm] = useState(String(defaultBpm));
  const [targetBpm, setTargetBpm] = useState(String(clampBpm(defaultBpm + 20)));

  useEffect(() => {
    if (visible) {
      setName("");
      setCurrentBpm(String(defaultBpm));
      setTargetBpm(String(clampBpm(defaultBpm + 20)));
    }
  }, [visible, defaultBpm]);

  const handleSave = () => {
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
    onSave({ name: name.trim(), currentBpm: parsedCurrent, targetBpm: parsedTarget });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="フレーズとして保存">
      <View style={{ gap: 12, paddingTop: 8, paddingBottom: 8 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.onSurfaceVariant }}>名前</Text>
          <TextInput
            style={{
              height: 44,
              borderRadius: radius.md,
              paddingHorizontal: 16,
              fontSize: 16,
              backgroundColor: colors.surfaceContainerLow,
              color: colors.onSurface,
            }}
            value={name}
            onChangeText={setName}
            placeholder="例: 速弾きフレーズ1"
            placeholderTextColor={colors.onSurfaceVariant}
            accessibilityLabel="フレーズ名入力"
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.onSurfaceVariant }}>現在BPM</Text>
            <TextInput
              style={{
                height: 44,
                borderRadius: radius.md,
                paddingHorizontal: 16,
                fontSize: 16,
                backgroundColor: colors.surfaceContainerLow,
                color: colors.onSurface,
              }}
              value={currentBpm}
              onChangeText={setCurrentBpm}
              keyboardType="number-pad"
              accessibilityLabel="現在BPM入力"
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.onSurfaceVariant }}>目標BPM</Text>
            <TextInput
              style={{
                height: 44,
                borderRadius: radius.md,
                paddingHorizontal: 16,
                fontSize: 16,
                backgroundColor: colors.surfaceContainerLow,
                color: colors.onSurface,
              }}
              value={targetBpm}
              onChangeText={setTargetBpm}
              keyboardType="number-pad"
              accessibilityLabel="目標BPM入力"
            />
          </View>
        </View>

        <Button label="保存する" onPress={handleSave} fullWidth />
      </View>
    </BottomSheet>
  );
}
