import { shadows } from "@/shared/theme";
/**
 * 練習タブ内カード共通スタイル
 * PracticeTab分割後の各カードコンポーネントで共有する
 */

export const cardShadowStyle = {
  ...shadows.layered,
};

export const cardStyle = {
  padding: 20,
  borderRadius: 16,
};
