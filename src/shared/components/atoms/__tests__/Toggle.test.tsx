import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { colors } from "@/shared/theme";
import { Toggle } from "../Toggle";

function renderToggle(props: { value: boolean; disabled?: boolean }) {
  const onValueChange = jest.fn();
  render(<Toggle {...props} onValueChange={onValueChange} accessibilityLabel="テスト用スイッチ" />);
  const track = screen.getByRole("switch", { name: "テスト用スイッチ" });
  const thumb = within(track).getByTestId("toggle-thumb");
  return { onValueChange, trackStyle: StyleSheet.flatten(track.props.style), thumbStyle: StyleSheet.flatten(thumb.props.style), track };
}

describe("Toggle", () => {
  it("OFFはトラックが outline、つまみが白で左寄せ", () => {
    const { trackStyle, thumbStyle } = renderToggle({ value: false });
    expect(trackStyle.backgroundColor).toBe(colors.outline);
    expect(trackStyle.alignItems).toBe("flex-start");
    expect(thumbStyle.backgroundColor).toBe(colors.surfaceContainerLowest);
  });

  it("ONはトラックが primary、つまみが白で右寄せ", () => {
    const { trackStyle, thumbStyle } = renderToggle({ value: true });
    expect(trackStyle.backgroundColor).toBe(colors.primary);
    expect(trackStyle.alignItems).toBe("flex-end");
    expect(thumbStyle.backgroundColor).toBe(colors.surfaceContainerLowest);
  });

  it("押すと反転した値を onValueChange に渡す", () => {
    const { onValueChange, track } = renderToggle({ value: false });
    fireEvent.press(track);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it("checked を読み上げ状態に反映する", () => {
    const { track } = renderToggle({ value: true });
    expect(track.props.accessibilityState).toMatchObject({ checked: true, disabled: false });
  });

  it("disabled のときは押しても呼ばず、読み上げにも無効を伝える", () => {
    const { onValueChange, track } = renderToggle({ value: false, disabled: true });
    fireEvent.press(track);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(track.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("見た目は高さ24でもタップ領域は縦44を確保する", () => {
    const { trackStyle, track } = renderToggle({ value: false });
    const hitSlop = track.props.hitSlop as { top?: number; bottom?: number };
    expect((trackStyle.height as number) + (hitSlop.top ?? 0) + (hitSlop.bottom ?? 0)).toBeGreaterThanOrEqual(44);
  });
});
