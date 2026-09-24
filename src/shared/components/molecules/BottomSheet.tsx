/**
 * 下から出るシート
 *
 * 1画面に収まらない情報の逃がし先。ドラッグでの段階切り替えは持たず、開くか閉じるかだけにする。
 */

import { useEffect, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "../atoms/IconButton";
import { colors, radius } from "@/shared/theme";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { EASING, ms } from "@/shared/lib/motion";

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** シートの最大高さ（画面高に対する割合） */
  maxHeightRatio?: number;
  /** 閉じるボタンを右上に出す */
  showCloseButton?: boolean;
};

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeightRatio = 0.9,
  showCloseButton = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: ms(reduced, "normal"),
      easing: EASING.decelerate,
    });
  }, [visible, reduced, progress]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 40 }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value * 0.55 }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.inverseSurface }, backdropStyle]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="閉じる"
            onPress={onClose}
            style={{ flex: 1 }}
          />
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Animated.View
            accessibilityViewIsModal
            style={[
              {
                maxHeight: `${maxHeightRatio * 100}%`,
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingTop: 8,
                paddingHorizontal: 16,
                paddingBottom: insets.bottom + 16,
              },
              sheetStyle,
            ]}
          >
            <View
              accessible={false}
              style={{
                width: 36,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.outlineVariant,
                alignSelf: "center",
              }}
            />
            <View
              style={{
                height: 44,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                style={{ fontSize: 17, fontWeight: "800", color: colors.onSurface }}
              >
                {title}
              </Text>
              {showCloseButton ? (
                <IconButton
                  name="close"
                  accessibilityLabel="閉じる"
                  onPress={onClose}
                  style={{ marginRight: -10 }}
                />
              ) : null}
            </View>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
