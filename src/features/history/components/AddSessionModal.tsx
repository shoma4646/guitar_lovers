import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { randomUUID } from "expo-crypto";
import { colors } from "@/shared/constants/colors";
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
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>練習を記録</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            >
              <Ionicons name="close" size={24} color={colors.textGray} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>練習時間（分）</Text>
          <TextInput
            style={styles.input}
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            placeholder="30"
            placeholderTextColor={colors.textGray}
            keyboardType="numeric"
            accessibilityLabel="練習時間入力"
          />

          <Text style={styles.inputLabel}>メモ（任意）</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="今日の練習について..."
            placeholderTextColor={colors.textGray}
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
      </View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
    backgroundColor: colors.bgLightDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    color: colors.textWhite,
    fontSize: 18,
    fontWeight: "700",
  },
  inputLabel: {
    color: colors.textGray,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.bgGray,
    color: colors.textWhite,
  },
  textarea: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  saveButton: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: "700",
  },
});
