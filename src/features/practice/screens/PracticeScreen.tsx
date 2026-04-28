/**
 * 練習画面
 * YouTube動画を使った練習機能を提供する。
 * 3タブ構成（練習・プリセット・お気に入り）でロジックは各components配下へ分割。
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/shared/constants/colors";
import { ErrorBoundary } from "@/shared/components/molecules/ErrorBoundary";
import { PracticeTab } from "@/features/practice/components/PracticeTab";
import { PresetsTab } from "@/features/practice/components/PresetsTab";
import { FavoritesTab } from "@/features/practice/components/FavoritesTab";

type TabKey = "practice" | "presets" | "favorites";

const TABS: { key: TabKey; label: string }[] = [
  { key: "practice", label: "練習" },
  { key: "presets", label: "プリセット" },
  { key: "favorites", label: "お気に入り" },
];

/** 練習画面コンポーネント */
export function PracticeScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("practice");

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tab,
                  active && {
                    borderBottomColor: colors.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? colors.primary : colors.textGray },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === "practice" && <PracticeTab />}
        {activeTab === "presets" && <PresetsTab />}
        {activeTab === "favorites" && <FavoritesTab />}
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.bgGray,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
