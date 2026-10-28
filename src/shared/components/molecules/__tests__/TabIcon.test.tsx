import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { textStyles } from "@/shared/theme";
import {
  TAB_BAR_CONTENT_HEIGHT,
  TAB_BAR_PADDING_TOP,
  TAB_ICON_PILL_HEIGHT,
  TAB_ICON_PILL_WIDTH,
  TAB_ITEM_VERTICAL_PADDING,
  TAB_LABEL_MARGIN_TOP,
} from "@/shared/constants/layout";
import { Icon } from "@/shared/components/atoms/Icon";
import { TAB_BAR_ICON_STYLE, TAB_ICON_SIZE, TabIcon } from "../TabIcon";

describe("タブアイコンの寸法", () => {
  it("アイコン枠は楕円の外形以上の大きさがある", () => {
    expect(TAB_BAR_ICON_STYLE.width).toBeGreaterThanOrEqual(TAB_ICON_PILL_WIDTH);
    expect(TAB_BAR_ICON_STYLE.height).toBeGreaterThanOrEqual(TAB_ICON_PILL_HEIGHT);
  });

  it("楕円はアイコンより大きい", () => {
    expect(TAB_ICON_PILL_WIDTH).toBeGreaterThan(TAB_ICON_SIZE);
    expect(TAB_ICON_PILL_HEIGHT).toBeGreaterThanOrEqual(TAB_ICON_SIZE);
  });

  it("楕円＋ラベル余白＋ラベルの行の高さが、タブバーの中身の高さ−上余白−タブ項目の上下余白に収まる", () => {
    expect(TAB_ICON_PILL_HEIGHT + TAB_LABEL_MARGIN_TOP + textStyles.labelSm.lineHeight).toBeLessThanOrEqual(
      TAB_BAR_CONTENT_HEIGHT - TAB_BAR_PADDING_TOP - TAB_ITEM_VERTICAL_PADDING * 2,
    );
  });
});

describe("TabIcon", () => {
  it.each([true, false])("focused=%s でもアイコンを描き、楕円に幅を削る余白が無い", (focused) => {
    render(<TabIcon name="timer" focused={focused} />);

    expect(screen.UNSAFE_getAllByType(Icon)).toHaveLength(1);
    const pill = StyleSheet.flatten(screen.getByTestId("tab-icon-pill").props.style);
    expect(pill.width).toBe("100%");
    expect(pill.height).toBe("100%");
    expect(pill.padding).toBeUndefined();
    expect(pill.paddingHorizontal).toBeUndefined();
    expect(pill.paddingVertical).toBeUndefined();
  });
});
