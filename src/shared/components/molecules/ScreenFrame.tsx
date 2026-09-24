/**
 * タブ画面の骨格
 *
 * iPhone 16 Pro ではスクロールさせずに1画面へ収める。小さい端末や文字サイズ拡大で
 * 作業領域が足りないときだけスクロールへ切り替え、操作不能になるのを防ぐ。
 */

import type { ReactNode } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/shared/theme";
import { MIN_ONE_SCREEN_BUDGET, TAB_BAR_CONTENT_HEIGHT } from "@/shared/constants/layout";

type Props = {
  children: ReactNode;
  /** 画面下端の余白。練習中バーのように自前で下に置く要素があるときに調整する */
  paddingBottom?: number;
};

export function ScreenFrame({ children, paddingBottom = 12 }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const budget = height - insets.top - (TAB_BAR_CONTENT_HEIGHT + insets.bottom);
  const fits = budget >= MIN_ONE_SCREEN_BUDGET;

  const content = (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom, gap: 12 }}>{children}</View>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.surface }}>
      {fits ? (
        content
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>{content}</ScrollView>
      )}
    </SafeAreaView>
  );
}
