import { View } from "react-native";
import { Icon, type IconName } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
import { TAB_ICON_PILL_HEIGHT, TAB_ICON_PILL_WIDTH } from "@/shared/constants/layout";

/** タブアイコンの大きさ */
export const TAB_ICON_SIZE = 24;

/** タブのアイコン枠の大きさ。ライブラリ既定（31×28）のままだと楕円が切り詰められてアイコンの描画幅が0になる */
export const TAB_BAR_ICON_STYLE = {
  width: TAB_ICON_PILL_WIDTH,
  height: TAB_ICON_PILL_HEIGHT,
} as const;

/**
 * 下部タブのアイコン。アイコン枠いっぱいの楕円の中央にアイコンを置き、
 * 選択中は primary の薄い背景と primary 色、非選択時は背景なしの outline 色で描く
 */
export function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View
      testID="tab-icon-pill"
      style={{
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 9999,
        backgroundColor: focused ? `${colors.primaryContainer}1A` : "transparent",
      }}
    >
      <Icon name={name} size={TAB_ICON_SIZE} color={focused ? colors.primary : colors.outline} />
    </View>
  );
}
