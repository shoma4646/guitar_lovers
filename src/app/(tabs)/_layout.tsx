/**
 * タブナビゲーションレイアウト
 * アプリの4つのメインタブ（チューナー・練習・記録・ニュース）を定義する
 */

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/shared/constants/colors";

/** タブアイコンのサイズ */
const ICON_SIZE = 24;

/**
 * タブレイアウトコンポーネント
 * 各タブのアイコン・ラベル・ヘッダースタイルを設定する
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // タブバースタイル
        tabBarStyle: {
          backgroundColor: colors.bgDark,
          borderTopColor: colors.bgGray,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textGray,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        // ヘッダースタイル（全タブ共通）
        headerStyle: {
          backgroundColor: colors.bgDark,
        },
        headerTintColor: colors.textWhite,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
          color: colors.textWhite,
        },
        headerShadowVisible: false,
        headerTitle: "Guitar Lovers",
      }}
    >
      {/* チューナータブ */}
      <Tabs.Screen
        name="tuner"
        options={{
          title: "チューナー",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "musical-note" : "musical-note-outline"}
              size={ICON_SIZE}
              color={color}
            />
          ),
        }}
      />

      {/* 練習タブ */}
      <Tabs.Screen
        name="practice"
        options={{
          title: "練習",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "play-circle" : "play-circle-outline"}
              size={ICON_SIZE}
              color={color}
            />
          ),
        }}
      />

      {/* 記録タブ */}
      <Tabs.Screen
        name="history"
        options={{
          title: "記録",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              size={ICON_SIZE}
              color={color}
            />
          ),
        }}
      />

      {/* ニュースタブ */}
      <Tabs.Screen
        name="news"
        options={{
          title: "ニュース",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "newspaper" : "newspaper-outline"}
              size={ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
