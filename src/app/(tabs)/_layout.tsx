/**
 * タブナビゲーションレイアウト
 *
 * Stitch DESIGN.md（modern_guitarist）準拠:
 * - 下部タブバー: warm surface 背景 + outline-variant の細い上罫線
 * - アクティブタブ: primary-container を 10% 透過した pill 背景 + primary 色
 * - 非アクティブタブ: outline 色
 * - ラベル: label-sm (13px / 600)
 * - 上部ヘッダーは画面ごとに自前で描画する（Stitch では画面によりレイアウトが異なるため）
 */

import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_ICON_STYLE, TabIcon } from "@/shared/components/molecules/TabIcon";
import { colors, textStyles } from "@/shared/theme";
import {
  TAB_BAR_CONTENT_HEIGHT,
  TAB_BAR_PADDING_TOP,
  TAB_LABEL_MARGIN_TOP,
} from "@/shared/constants/layout";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: 1,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingTop: TAB_BAR_PADDING_TOP,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        tabBarIconStyle: TAB_BAR_ICON_STYLE,
        tabBarLabelStyle: {
          ...textStyles.labelSm,
          marginTop: TAB_LABEL_MARGIN_TOP,
        },
      }}
    >
      <Tabs.Screen
        name="practice"
        options={{
          title: "Practice",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="timer" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="history" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tuner"
        options={{
          title: "Tuner",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="tune" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
