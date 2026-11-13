import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert, Keyboard } from "react-native";
import { SavePhraseSheet } from "../SavePhraseSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

function setup(onSave: jest.Mock) {
  render(<SavePhraseSheet visible onClose={jest.fn()} defaultBpm={80} onSave={onSave} />);
}

function pressSave() {
  fireEvent.press(screen.getByText("保存する"));
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("SavePhraseSheet", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it("名前が空でエラーになった後、名前を入れて押すとonSaveが1回呼ばれる", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    setup(onSave);

    pressSave();
    expect(alertSpy).toHaveBeenCalledWith("エラー", "フレーズの名前を入力してください");
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText("フレーズ名入力"), "速弾き");
    pressSave();
    await flushPromises();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ name: "速弾き", currentBpm: 80, targetBpm: 100 });
  });

  it("onSaveがrejectした後も、もう一度押すとonSaveが呼ばれる", async () => {
    const onSave = jest.fn().mockRejectedValueOnce(new Error("失敗")).mockResolvedValue(undefined);
    setup(onSave);
    fireEvent.changeText(screen.getByLabelText("フレーズ名入力"), "速弾き");

    pressSave();
    await flushPromises();
    pressSave();
    await flushPromises();

    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("保存中に連打してもonSaveは1回だけ呼ばれる", async () => {
    let resolveSave: () => void = () => {};
    const onSave = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    setup(onSave);
    fireEvent.changeText(screen.getByLabelText("フレーズ名入力"), "速弾き");

    pressSave();
    pressSave();
    pressSave();
    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave();
    });
  });

  describe("キーボード表示中の背景タップ", () => {
    let isVisibleSpy: jest.SpyInstance;
    let dismissSpy: jest.SpyInstance;

    beforeEach(() => {
      isVisibleSpy = jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
      dismissSpy = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
    });

    afterEach(() => {
      isVisibleSpy.mockRestore();
      dismissSpy.mockRestore();
    });

    /** onCloseで実際にシートを閉じる親（閉じると次に開いたとき入力が初期化される） */
    function SheetHost() {
      const [visible, setVisible] = useState(true);
      return (
        <SavePhraseSheet
          visible={visible}
          onClose={() => setVisible(false)}
          defaultBpm={80}
          onSave={jest.fn()}
        />
      );
    }

    it("名前と目標BPMを入力した後に背景を押しても、シートは閉じず入力が残る", () => {
      render(<SheetHost />);
      fireEvent.changeText(screen.getByLabelText("フレーズ名入力"), "サビのソロ");
      fireEvent.changeText(screen.getByLabelText("目標BPM入力"), "140");

      fireEvent.press(screen.getByTestId("bottom-sheet-backdrop"));

      expect(dismissSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText("フレーズ名入力").props.value).toBe("サビのソロ");
      expect(screen.getByLabelText("目標BPM入力").props.value).toBe("140");
    });
  });
});
