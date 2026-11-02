import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Chip } from "../Chip";

describe("Chip", () => {
  it("growのチップは文字を1行に保ち、枠に収まるよう縮小する", () => {
    render(<Chip label="1.25x" selected={false} onPress={jest.fn()} grow />);

    const text = screen.getByText("1.25x");
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.adjustsFontSizeToFit).toBe(true);
    expect(text.props.minimumFontScale).toBeGreaterThan(0);
    expect(text.props.minimumFontScale).toBeLessThan(1);
  });

  it("growのチップは左右に内側余白を確保する", () => {
    render(<Chip label="1.25x" selected={false} onPress={jest.fn()} grow />);

    const style = StyleSheet.flatten(screen.getByRole("radio").props.style);
    expect(style.paddingHorizontal).toBeGreaterThanOrEqual(2);
    expect(style.paddingHorizontal).toBeLessThanOrEqual(4);
  });

  it("growでないチップの見た目は変わらない（余白14・折り返しや縮小の指定なし）", () => {
    render(<Chip label="120" selected onPress={jest.fn()} />);

    const text = screen.getByText("120");
    expect(text.props.numberOfLines).toBeUndefined();
    expect(text.props.adjustsFontSizeToFit).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByRole("radio").props.style).paddingHorizontal).toBe(14);
  });
});
