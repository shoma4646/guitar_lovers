import { render, fireEvent, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { BottomSheet } from "../BottomSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

function setup(visible: boolean, onClose = jest.fn()) {
  render(
    <BottomSheet visible={visible} onClose={onClose} title="最近の記録">
      <Text>中身</Text>
    </BottomSheet>,
  );
  return { onClose };
}

describe("BottomSheet", () => {
  it("visibleがtrueならタイトルと中身を表示する", () => {
    setup(true);
    expect(screen.getByText("最近の記録")).toBeTruthy();
    expect(screen.getByText("中身")).toBeTruthy();
  });

  it("visibleがfalseなら中身を表示しない", () => {
    setup(false);
    expect(screen.queryByText("中身")).toBeNull();
  });

  it("背景をタップするとonCloseを呼ぶ", () => {
    const { onClose } = setup(true);
    fireEvent.press(screen.getAllByLabelText("閉じる")[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("閉じるボタンからもonCloseを呼べる", () => {
    const { onClose } = setup(true);
    const closers = screen.getAllByLabelText("閉じる");
    fireEvent.press(closers[closers.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
