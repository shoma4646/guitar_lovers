import { useCallback, useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { randomUUID } from "expo-crypto";
import { BottomSheet } from "@/shared/components/molecules/BottomSheet";
import { Button } from "@/shared/components/atoms/Button";
import { colors } from "@/shared/theme/colors";
import { fontSize, fontWeight, spacing, radius } from "@/shared/theme";
import type { PracticeSession } from "@/shared/types/models";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (session: PracticeSession) => void;
};

const DURATION_ERROR = "練習時間を入力してください（分単位）";

/** 練習記録を手動で追加するシート */
export function AddSessionModal({ visible, onClose, onSave }: Props) {
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setDurationMinutes("");
    setNotes("");
    setError(null);
  }, []);

  const handleSave = useCallback(() => {
    const minutes = parseInt(durationMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) {
      setError(DURATION_ERROR);
      return;
    }
    onSave({
      id: randomUUID(),
      date: new Date().toISOString(),
      duration: minutes * 60,
      notes: notes.trim() || undefined,
    });
    resetForm();
    onClose();
  }, [durationMinutes, notes, onSave, onClose, resetForm]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="練習を記録">
      <View style={styles.body}>
        <View style={styles.field}>
          <Text style={styles.inputLabel}>練習時間（分）</Text>
          <TextInput
            style={styles.input}
            value={durationMinutes}
            onChangeText={(text) => {
              setDurationMinutes(text);
              setError(null);
            }}
            placeholder="30"
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="numeric"
            accessibilityLabel="練習時間入力"
          />
          {error !== null && (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {error}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.inputLabel}>メモ（任意）</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="今日の練習について..."
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            numberOfLines={3}
            accessibilityLabel="メモ入力"
          />
        </View>

        <Button label="記録する" onPress={handleSave} size="lg" fullWidth />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  field: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.onSurfaceVariant,
    fontSize: fontSize.bodyXs,
    fontWeight: fontWeight.semibold,
  },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    fontSize: fontSize.headingSm,
    backgroundColor: colors.surfaceContainerLow,
    color: colors.onSurface,
  },
  textarea: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.bodyXs,
  },
});
