/**
 * 練習画面
 *
 * 1画面に収める再設計版: 日付＋見出しの1行ヘッダー（＋動画追加・設定）と
 * サブタブ（今日 / メニュー集 / お気に入り）だけをこの画面で組み、
 * サブタブごとの本体は各Tabコンポーネントへ委ねる。
 * 動画読み込み後（練習中）はPracticeTabが自前のヘッダーを持つため、
 * この画面の日付ヘッダーとサブタブは隠して1画面の高さ予算を譲る
 * （動画読み込みは必ずpracticeサブタブ経由なので、隠している間activeTabがずれることはない）。
 */

import React, { useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { IconButton } from "@/shared/components/atoms/IconButton";
import { SegmentedControl } from "@/shared/components/atoms/SegmentedControl";
import { ScreenFrame } from "@/shared/components/molecules/ScreenFrame";
import { colors } from "@/shared/theme";
import { ErrorBoundary } from "@/shared/components/molecules/ErrorBoundary";
import { usePracticeStore, type PracticeSubTab } from "@/stores/practice";
import { PracticeTab } from "@/features/practice/components/PracticeTab";
import { PresetsTab } from "@/features/practice/components/PresetsTab";
import { FavoritesTab } from "@/features/practice/components/FavoritesTab";
import { AddVideoSheet } from "@/features/practice/components/AddVideoSheet";

const TABS: { key: PracticeSubTab; label: string }[] = [
  { key: "practice", label: "今日" },
  { key: "presets", label: "メニュー集" },
  { key: "favorites", label: "お気に入り" },
];

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** ヘッダーの日付表示（例: 9月20日（日）） */
function formatHeaderDate(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAY_LABELS[date.getDay()]}）`;
}

export function PracticeScreen() {
  // Presets/Favoritesからの再生後に「今日」サブタブへ戻すため、ストアで保持する
  const activeTab = usePracticeStore((s) => s.practiceSubTab);
  const setActiveTab = usePracticeStore((s) => s.setPracticeSubTab);
  const loadedVideoId = usePracticeStore((s) => s.loadedVideoId);
  const setToolsSheetOpen = usePracticeStore((s) => s.setToolsSheetOpen);
  const router = useRouter();
  const [addVideoVisible, setAddVideoVisible] = useState(false);

  // 道具シート（メトロノーム・タイマー）はpracticeサブタブのPracticeTabが持つため、
  // 他のサブタブから開いても表示できるようpracticeへ切り替えてから開く
  const openToolsSheet = () => {
    setActiveTab("practice");
    setToolsSheetOpen(true);
  };

  return (
    <ErrorBoundary>
      <ScreenFrame>
        {!loadedVideoId && (
          <>
            <View style={{ height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.onSurfaceVariant }}>
                  {formatHeaderDate(new Date())}
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.onSurface }}>
                  今日の練習
                </Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                <IconButton
                  name="metronome"
                  accessibilityLabel="メトロノーム・タイマーを開く"
                  onPress={openToolsSheet}
                />
                <IconButton
                  name="add"
                  accessibilityLabel="動画を追加"
                  onPress={() => setAddVideoVisible(true)}
                />
                <IconButton
                  name="settings"
                  accessibilityLabel="設定を開く"
                  onPress={() => router.push("/settings")}
                />
              </View>
            </View>

            <SegmentedControl
              items={TABS.map(({ key, label }) => ({ value: key, label }))}
              value={activeTab}
              onChange={setActiveTab}
              role="tab"
              accessibilityLabel="練習タブ切り替え"
            />
          </>
        )}

        <View style={{ flex: 1 }}>
          {activeTab === "practice" && <PracticeTab onOpenAddVideo={() => setAddVideoVisible(true)} />}
          {activeTab === "presets" && <PresetsTab />}
          {activeTab === "favorites" && <FavoritesTab />}
        </View>
      </ScreenFrame>

      <AddVideoSheet visible={addVideoVisible} onClose={() => setAddVideoVisible(false)} />
    </ErrorBoundary>
  );
}
