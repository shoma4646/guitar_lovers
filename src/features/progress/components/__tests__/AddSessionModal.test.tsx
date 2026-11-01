import { Alert } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { AddSessionModal } from "../AddSessionModal";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "session-id" }));

function renderSheet() {
  const onClose = jest.fn();
  const onSave = jest.fn();
  render(<AddSessionModal visible onClose={onClose} onSave={onSave} />);
  return { onClose, onSave };
}

describe("AddSessionModal", () => {
  it("共通のBottomSheetに「練習を記録」の見出しで載っている", () => {
    renderSheet();

    expect(screen.getByTestId("bottom-sheet-title")).toHaveTextContent("練習を記録");
  });

  it("背景と右上の「閉じる」のどちらを押しても onClose が呼ばれる", () => {
    const { onClose } = renderSheet();

    const closeButtons = screen.getAllByRole("button", { name: "閉じる" });
    expect(closeButtons).toHaveLength(2);
    closeButtons.forEach((button) => fireEvent.press(button));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["空欄", ""],
    ["0分", "0"],
    ["数字以外", "abc"],
  ])("%sで「記録する」を押すと、Alertを出さず欄の下にエラー文を出して保存しない", (_label, input) => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const { onSave, onClose } = renderSheet();

    fireEvent.changeText(screen.getByLabelText("練習時間入力"), input);
    fireEvent.press(screen.getByRole("button", { name: "記録する" }));

    expect(screen.getByRole("alert")).toHaveTextContent("練習時間を入力してください（分単位）");
    expect(alertSpy).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("エラーの後に入力し直すとエラー文が消える", () => {
    renderSheet();

    fireEvent.press(screen.getByRole("button", { name: "記録する" }));
    fireEvent.changeText(screen.getByLabelText("練習時間入力"), "3");

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("正しく入力すると分を秒に直し、空白だけのメモは省いて保存してから閉じる", () => {
    const { onSave, onClose } = renderSheet();

    fireEvent.changeText(screen.getByLabelText("練習時間入力"), "30");
    fireEvent.changeText(screen.getByLabelText("メモ入力"), "   ");
    fireEvent.press(screen.getByRole("button", { name: "記録する" }));

    expect(onSave).toHaveBeenCalledWith({
      id: "session-id",
      date: expect.any(String),
      duration: 1800,
      notes: undefined,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
