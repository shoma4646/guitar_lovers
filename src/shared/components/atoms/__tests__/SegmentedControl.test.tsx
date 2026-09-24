import { render, fireEvent, screen } from "@testing-library/react-native";
import { SegmentedControl } from "../SegmentedControl";

const items = [
  { value: "improving" as const, label: "上達中", suffix: "5" },
  { value: "graduated" as const, label: "卒業", suffix: "3" },
];

describe("SegmentedControl", () => {
  it("選択中の項目にselectedを立てる", () => {
    render(
      <SegmentedControl
        items={items}
        value="improving"
        onChange={jest.fn()}
        accessibilityLabel="フレーズの表示切り替え"
      />,
    );
    expect(screen.getByRole("tab", { name: "上達中" }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole("tab", { name: "卒業" }).props.accessibilityState.selected).toBe(false);
  });

  it("未選択の項目を押すとonChangeにその値を渡す", () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        items={items}
        value="improving"
        onChange={onChange}
        accessibilityLabel="フレーズの表示切り替え"
      />,
    );
    fireEvent.press(screen.getByRole("tab", { name: "卒業" }));
    expect(onChange).toHaveBeenCalledWith("graduated");
  });

  it("role=radioなら排他選択として読み上げる", () => {
    render(
      <SegmentedControl
        items={items}
        value="graduated"
        onChange={jest.fn()}
        role="radio"
        accessibilityLabel="チューニングのプリセット"
      />,
    );
    expect(screen.getByRole("radio", { name: "卒業" }).props.accessibilityState.checked).toBe(true);
  });
});
