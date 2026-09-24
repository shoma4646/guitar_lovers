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
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconName } from "@/shared/components/atoms/Icon";
import { colors, textStyles } from "@/shared/theme";
import { TAB_BAR_CONTENT_HEIGHT } from "@/shared/constants/layout";

const ICON_SIZE = 24;


/**
 * pill 形状のアイコン背景
 *
 * アクティブ時は primary 色の薄い背景に primary 色のアイコン、
 * 非アクティブ時は背景なし + outline 色のアイコン。
 */
function TabIcon({
  name,
  focused,
}: {
  name: IconName;
  focused: boolean;
}) {
  return (
    <View
      style={{
        paddingHorizontal: focused ? 16 : 0,
        paddingVertical: focused ? 6 : 0,
        borderRadius: 9999,
        backgroundColor: focused
          ? `${colors.primaryContainer}1A` // 10% 透過
          : "transparent",
      }}
    >
      <Icon
        name={name}
        size={ICON_SIZE}
        color={focused ? colors.primary : colors.outline}
      />
    </View>
  );
}

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
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        tabBarLabelStyle: {
          ...textStyles.labelSm,
          marginTop: 4,
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
