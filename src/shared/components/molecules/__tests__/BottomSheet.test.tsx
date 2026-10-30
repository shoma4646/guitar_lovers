import { render, fireEvent, screen, act } from "@testing-library/react-native";
import { Modal, Platform, StyleSheet, Text } from "react-native";
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

  describe("長い見出し", () => {
    it("見出しは既定で2行まで、縮んで閉じるボタンを押し出さない", () => {
      setup(true);
      const title = screen.getByTestId("bottom-sheet-title");
      expect(title.props.numberOfLines).toBe(2);
      expect(StyleSheet.flatten(title.props.style).flexShrink).toBeGreaterThanOrEqual(1);
    });

    it("見出し行は高さ固定ではなく最小44で、折り返した分だけ伸びる", () => {
      setup(true);
      const header = StyleSheet.flatten(screen.getByTestId("bottom-sheet-header").props.style);
      expect(header.height).toBeUndefined();
      expect(header.minHeight).toBe(44);
    });

    it("titleNumberOfLinesで最大行数を変えられる", () => {
      render(
        <BottomSheet visible onClose={jest.fn()} title="t" titleNumberOfLines={1}>
          <Text>中身</Text>
        </BottomSheet>,
      );
      expect(screen.getByTestId("bottom-sheet-title").props.numberOfLines).toBe(1);
    });
  });

  describe("onDismissed", () => {
    const originalOS = Platform.OS;

    afterEach(() => {
      Platform.OS = originalOS;
    });

    function renderSheet(visible: boolean, onDismissed: () => void) {
      return (
        <BottomSheet visible={visible} onClose={jest.fn()} title="t" onDismissed={onDismissed}>
          <Text>中身</Text>
        </BottomSheet>
      );
    }

    it("iOSではModalが閉じ終わったとき（onDismiss）に呼ぶ", () => {
      Platform.OS = "ios";
      const onDismissed = jest.fn();
      const { rerender } = render(renderSheet(true, onDismissed));

      rerender(renderSheet(false, onDismissed));
      expect(onDismissed).not.toHaveBeenCalled();

      act(() => screen.UNSAFE_getByType(Modal).props.onDismiss());
      expect(onDismissed).toHaveBeenCalledTimes(1);
    });

    it("iOS以外ではModalのonDismissが無いため、閉じた時点で1回だけ呼ぶ", () => {
      Platform.OS = "android";
      const onDismissed = jest.fn();
      const { rerender } = render(renderSheet(false, onDismissed));
      expect(onDismissed).not.toHaveBeenCalled();

      rerender(renderSheet(true, onDismissed));
      rerender(renderSheet(false, onDismissed));
      rerender(renderSheet(false, onDismissed));

      expect(onDismissed).toHaveBeenCalledTimes(1);
      expect(screen.UNSAFE_getByType(Modal).props.onDismiss).toBeUndefined();
    });
  });
});
