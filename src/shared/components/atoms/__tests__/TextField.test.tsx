import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { colors, radius } from "@/shared/theme";
import { TextField } from "../TextField";

describe("TextField", () => {
  it("高さを固定せず44pt以上を保ち、文字の拡大に上限を設ける", () => {
    render(<TextField value="" onChangeText={jest.fn()} accessibilityLabel="入力" />);

    const input = screen.getByLabelText("入力");
    const style = StyleSheet.flatten(input.props.style);
    expect(style.height).toBeUndefined();
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(input.props.maxFontSizeMultiplier).toBe(1.6);
  });

  it("標準の文字サイズでは従来と同じ44ptに収まる（余白込みで16ptの1行が44pt以下）", () => {
    render(<TextField value="" onChangeText={jest.fn()} accessibilityLabel="入力" />);

    const style = StyleSheet.flatten(screen.getByLabelText("入力").props.style);
    const lineHeightAt16pt = 20;
    expect(lineHeightAt16pt + (style.paddingVertical as number) * 2).toBeLessThanOrEqual(44);
    expect(style).toMatchObject({
      borderRadius: radius.md,
      paddingHorizontal: 16,
      fontSize: 16,
      backgroundColor: colors.surfaceContainerLow,
      color: colors.onSurface,
    });
  });

  it("呼び出し側のstyleは既定の見た目に追加で重なる", () => {
    render(<TextField value="" onChangeText={jest.fn()} accessibilityLabel="入力" style={{ flex: 1 }} />);

    const style = StyleSheet.flatten(screen.getByLabelText("入力").props.style);
    expect(style.flex).toBe(1);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });
});
