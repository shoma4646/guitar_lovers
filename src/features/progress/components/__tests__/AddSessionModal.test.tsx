import { AccessibilityInfo, Alert, Keyboard } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { isInsideVerticalScroll } from "@/shared/testing/sheetScroll";
import { AddSessionModal } from "../AddSessionModal";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "session-id" }));

function renderSheet(onSave: jest.Mock = jest.fn(async () => undefined)) {
  const onClose = jest.fn();
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

  it("メモ入力中（キーボード表示中）に背景を押しても、閉じずにメモが残る", () => {
    const isVisibleSpy = jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    const dismissSpy = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
    const { onClose } = renderSheet();
    fireEvent.changeText(screen.getByLabelText("メモ入力"), "Aメロのカッティング");

    fireEvent.press(screen.getByTestId("bottom-sheet-backdrop"));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("メモ入力").props.value).toBe("Aメロのカッティング");
    isVisibleSpy.mockRestore();
    dismissSpy.mockRestore();
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

  it("正しく入力すると分を秒に直し、空白だけのメモは省いて保存し、保存が終わってから入力を消して閉じる", async () => {
    let finishSave: () => void = () => {};
    const { onSave, onClose } = renderSheet(
      jest.fn(() => new Promise<void>((resolve) => (finishSave = resolve))),
    );

    fireEvent.changeText(screen.getByLabelText("練習時間入力"), "30");
    fireEvent.changeText(screen.getByLabelText("メモ入力"), "   ");
    fireEvent.press(screen.getByRole("button", { name: "記録する" }));

    expect(onSave).toHaveBeenCalledWith({
      id: "session-id",
      date: expect.any(String),
      duration: 1800,
      notes: undefined,
    });
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => finishSave());

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("練習時間入力").props.value).toBe("");
    expect(screen.getByLabelText("メモ入力").props.value).toBe("");
  });

  it("保存に失敗したら閉じずに、入れた練習時間とメモを残す", async () => {
    const { onSave, onClose } = renderSheet(jest.fn(async () => Promise.reject(new Error("disk full"))));

    fireEvent.changeText(screen.getByLabelText("練習時間入力"), "45");
    fireEvent.changeText(screen.getByLabelText("メモ入力"), "Aメロ");
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "記録する" }));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("練習時間入力").props.value).toBe("45");
    expect(screen.getByLabelText("メモ入力").props.value).toBe("Aメロ");
    expect(screen.getByRole("button", { name: "記録する" })).not.toBeDisabled();
  });

  it("保存中にもう一度押しても、保存は1回だけ", async () => {
    let finishSave: () => void = () => {};
    const { onSave } = renderSheet(jest.fn(() => new Promise<void>((resolve) => (finishSave = resolve))));

    fireEvent.changeText(screen.getByLabelText("練習時間入力"), "45");
    fireEvent.press(screen.getByRole("button", { name: "記録する" }));
    fireEvent.press(screen.getByRole("button", { name: "記録する" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "記録する" })).toBeDisabled();
    await act(async () => finishSave());
  });
});

describe("AddSessionModal のエラーの読み上げ", () => {
  let announceSpy: jest.SpyInstance;

  beforeEach(() => {
    announceSpy = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
    announceSpy.mockClear();
  });

  afterEach(() => {
    announceSpy.mockRestore();
  });

  it("練習時間が空のまま「記録する」を押すと、エラー文を1回読み上げる", () => {
    renderSheet();

    fireEvent.press(screen.getByRole("button", { name: "記録する" }));

    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenCalledWith("練習時間を入力してください（分単位）");
  });

  it("エラーが出たままメモを入力して再描画しても、重ねて読み上げない", () => {
    renderSheet();
    fireEvent.press(screen.getByRole("button", { name: "記録する" }));

    fireEvent.changeText(screen.getByLabelText("メモ入力"), "Aメロ");

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(announceSpy).toHaveBeenCalledTimes(1);
  });

  it("入力し直してエラーが消えた後にまた空で押すと、改めて読み上げる", () => {
    renderSheet();
    fireEvent.press(screen.getByRole("button", { name: "記録する" }));
    fireEvent.changeText(screen.getByLabelText("練習時間入力"), "");
    fireEvent.press(screen.getByRole("button", { name: "記録する" }));

    expect(announceSpy).toHaveBeenCalledTimes(2);
  });
});

describe("AddSessionModal の文字を大きくしたとき", () => {
  it("入力欄と「記録する」はシートの縦スクロールの中に描き、画面からはみ出しても届く", () => {
    renderSheet();

    expect(isInsideVerticalScroll(screen.getByLabelText("練習時間入力"))).toBe(true);
    expect(isInsideVerticalScroll(screen.getByLabelText("メモ入力"))).toBe(true);
    expect(isInsideVerticalScroll(screen.getByText("記録する"))).toBe(true);
  });
});
