/**
 * OSの「視差効果を減らす」が有効かを返す
 *
 * Reanimated の同名フックを薄く包んでいる。テストで差し替えやすくするためと、
 * 将来アプリ内設定でアニメを切れるようにする余地を残すため。
 */

import { useReducedMotion as useReanimatedReducedMotion } from "react-native-reanimated";

export function useReducedMotion(): boolean {
  return useReanimatedReducedMotion();
}
