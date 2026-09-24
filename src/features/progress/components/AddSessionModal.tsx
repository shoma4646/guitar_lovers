import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { randomUUID } from "expo-crypto";
import { colors } from "@/shared/theme/colors";
import { fontSize, fontWeight, spacing, radius } from "@/shared/theme";
import type { PracticeSession } from "@/shared/types/models";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (session: PracticeSession) => void;
};

/** 新規練習セッション追加モーダル */
export function AddSessionModal({ visible, onClose, onSave }: Props) {
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = useCallback(() => {
    const minutes = parseInt(durationMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert("エラー", "練習時間を入力してください（分単位）");
      return;
    }
    onSave({
      id: randomUUID(),
      date: new Date().toISOString(),
      duration: minutes * 60,
      notes: notes.trim() || undefined,
    });
    setDurationMinutes("");
    setNotes("");
    onClose();
  }, [durationMinutes, notes, onSave, onClose]);

  const handleClose = useCallback(() => {
    setDurationMinutes("");
    setNotes("");
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>練習を記録</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            >
              <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>練習時間（分）</Text>
          <TextInput
            style={styles.input}
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            placeholder="30"
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="numeric"
            accessibilityLabel="練習時間入力"
          />

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

          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            accessibilityRole="button"
          >
            <Text style={styles.saveButtonText}>記録する</Text>
          </TouchableOpacity>
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
    padding: spacing.xl,
    paddingBottom: spacing["4xl"],
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.onSurface,
    fontSize: fontSize.headingMd,
    fontWeight: fontWeight.bold,
  },
  inputLabel: {
    color: colors.onSurfaceVariant,
    fontSize: fontSize.bodyXs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
  saveButton: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.onPrimary,
    fontSize: fontSize.headingSm,
    fontWeight: fontWeight.bold,
  },
});
