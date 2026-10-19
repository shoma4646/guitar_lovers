/**
 * 区間をフレーズとして保存するシート
 *
 * PracticeControlPanelの「この区間を新しいフレーズにする」から開く。
 * 保存されたフレーズは今日の練習メニュー（TodayPickCard / TodayPhraseRows）に反復練習対象として現れる。
 */

import { useEffect, useRef, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { BottomSheet } from "@/shared/components/molecules/BottomSheet";
import { Button } from "@/shared/components/atoms/Button";
import { colors, radius } from "@/shared/theme";
import { clampBpm } from "@/shared/constants/bpm";
import { parsePhraseDraft, type SavePhraseInput } from "@/features/practice/lib/parsePhraseDraft";

export type { SavePhraseInput };

type Props = {
  visible: boolean;
  onClose: () => void;
  /** シートを開いた時点のBPM初期値（メトロノームの現在BPM） */
  defaultBpm: number;
  /** 保存処理。失敗時はrejectする（失敗の通知は呼び出し側が行う） */
  onSave: (input: SavePhraseInput) => Promise<void>;
};

export function SavePhraseSheet({ visible, onClose, defaultBpm, onSave }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  // 再描画でボタンが無効化される前の連打も弾くため、stateとは別に同期的なフラグを持つ
  const isSavingRef = useRef(false);
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

  const handleSave = async () => {
    if (isSavingRef.current) return;
    const parsed = parsePhraseDraft({ name, currentBpm, targetBpm });
    if (!parsed.ok) {
      Alert.alert("エラー", parsed.error);
      return;
    }
    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await onSave(parsed.value);
    } catch {
      // 失敗の通知は呼び出し側が済ませているので、ここでは再度押せる状態に戻すだけ
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
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

        <Button label="保存する" onPress={() => void handleSave()} disabled={isSaving} fullWidth />
      </View>
    </BottomSheet>
  );
}
