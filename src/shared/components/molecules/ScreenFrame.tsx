/**
 * タブ画面の骨格
 *
 * iPhone 16 Pro ではスクロールさせずに1画面へ収める。小さい端末や文字サイズ拡大で
 * 作業領域が足りないときだけスクロールへ切り替え、操作不能になるのを防ぐ。
 */

import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/shared/theme";
import { SCREEN_HORIZONTAL_PADDING } from "@/shared/constants/layout";
import { useFitsOneScreen } from "@/shared/hooks/useFitsOneScreen";

type Props = {
  children: ReactNode;
  /** 画面下端の余白。練習中バーのように自前で下に置く要素があるときに調整する */
  paddingBottom?: number;
  /**
   * 収まらないときに画面全体をスクロールへ切り替えるか。下端に固定したい要素を持つ子が
   * 自前でスクロール領域を分けるときは false にする
   */
  scrollWhenOverflow?: boolean;
};

export function ScreenFrame({ children, paddingBottom = 12, scrollWhenOverflow = true }: Props) {
  const fits = useFitsOneScreen();

  const content = (
    <View style={{ flex: 1, paddingHorizontal: SCREEN_HORIZONTAL_PADDING, paddingBottom, gap: 12 }}>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.surface }}>
      {fits || !scrollWhenOverflow ? (
        content
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>{content}</ScrollView>
      )}
    </SafeAreaView>
  );
}
