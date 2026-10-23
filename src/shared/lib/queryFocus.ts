import { AppState, Platform } from "react-native";
import { focusManager } from "@tanstack/react-query";

/**
 * アプリの前面/背面を TanStack Query の focusManager へ伝え、前面復帰時に古い query を再取得させる。
 * Web はブラウザの visibilitychange を focusManager が自前で扱うため何もしない
 * @returns 購読を解除する関数
 */
export function connectQueryFocusToAppState(): () => void {
  if (Platform.OS === "web") return () => {};
  const subscription = AppState.addEventListener("change", (state) => {
    focusManager.setFocused(state === "active");
  });
  return () => subscription.remove();
}
