import { StyleSheet } from "react-native";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { colors } from "@/shared/theme";
import type { PracticePhrase } from "@/shared/types/models";
import { PhraseResultSheet } from "../PhraseResultSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const phrase: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "動画",
  name: "イントロ",
  startSec: 0,
  endSec: 10,
  currentBpm: 80,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

/** 子を読み上げ対象に残すためaccessibleにしないので、ByRoleではなくラベルで取得して役割を確かめる */
function getResultGroup() {
  const group = screen.getByLabelText("練習の結果");
  expect(group.props.accessibilityRole).toBe("radiogroup");
  return group;
}

function setup(onSubmit = jest.fn(), completedReps = 2, hasNextPhrase = true) {
  const onChangeCompletedReps = jest.fn();
  render(
    <PhraseResultSheet
      visible
      phrase={phrase}
      bpm={85}
      progress={null}
      phraseElapsedSeconds={60}
      completedReps={completedReps}
      onChangeCompletedReps={onChangeCompletedReps}
      hasNextPhrase={hasNextPhrase}
      isSubmitting={false}
      onClose={jest.fn()}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit, onChangeCompletedReps };
}

describe("PhraseResultSheet の回数の読み上げ", () => {
  it("回数は調整可能な要素で、値に「N回」を含む", () => {
    setup(jest.fn(), 3);
    const reps = screen.getByRole("adjustable", { name: "回数" });
    expect(reps.props.accessibilityValue.now).toBe(3);
    expect(reps.props.accessibilityValue.text).toContain("3回");
  });

  it("increment で onChangeCompletedReps(1)、decrement で onChangeCompletedReps(-1) が呼ばれる", () => {
    const { onChangeCompletedReps } = setup();
    const reps = screen.getByRole("adjustable", { name: "回数" });

    fireEvent(reps, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(onChangeCompletedReps).toHaveBeenLastCalledWith(1);

    fireEvent(reps, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(onChangeCompletedReps).toHaveBeenLastCalledWith(-1);
  });

  it("0回のときの decrement は −ボタンと同じく何もしない", () => {
    const { onChangeCompletedReps } = setup(jest.fn(), 0);
    const reps = screen.getByRole("adjustable", { name: "回数" });

    fireEvent(reps, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(onChangeCompletedReps).not.toHaveBeenCalled();
  });
});

describe("PhraseResultSheet の結果の3択", () => {
  it("3択は「練習の結果」という名前のradiogroupの中にある", () => {
    setup();
    const group = getResultGroup();
    expect(within(group).getAllByRole("radio").map((radio) => radio.props.accessibilityState)).toEqual([
      { checked: true },
      { checked: false },
      { checked: false },
    ]);
  });

  it("「弾けた」を押すとその要素がcheckedになり、他はuncheckedになる", () => {
    const { onSubmit } = setup();

    fireEvent.press(screen.getByRole("radio", { name: "あやしい" }));
    expect(screen.getByRole("radio", { name: "あやしい" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "弾けた" })).not.toBeChecked();

    fireEvent.press(screen.getByRole("radio", { name: "弾けた" }));
    expect(screen.getByRole("radio", { name: "弾けた" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "あやしい" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "弾けなかった" })).not.toBeChecked();

    fireEvent.press(screen.getByText("記録して次の1本へ"));
    expect(onSubmit).toHaveBeenCalledWith({ result: "ok" }, "next");
  });

  it("回数の増減ボタンは3択のradiogroupの外にある", () => {
    setup();
    const group = getResultGroup();
    expect(within(group).queryByLabelText("回数を増やす")).toBeNull();
    expect(within(group).queryByLabelText("回数を減らす")).toBeNull();
  });
});

describe("PhraseResultSheet の見出し", () => {
  it("40文字のフレーズ名でも見出しは1〜2行に収める", () => {
    const longName = "イントロのスウィープアルペジオ（サビ前の速いパッセージ）とチョーキングの組み合わせ練習";
    expect(longName.length).toBeGreaterThanOrEqual(40);
    render(
      <PhraseResultSheet
        visible
        phrase={{ ...phrase, name: longName }}
        bpm={85}
        progress={null}
        phraseElapsedSeconds={60}
        completedReps={0}
        onChangeCompletedReps={jest.fn()}
        hasNextPhrase
        isSubmitting={false}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    const title = screen.getByTestId("bottom-sheet-title");
    expect(title.props.children).toBe(longName);
    expect([1, 2]).toContain(title.props.numberOfLines);
  });
});

function backgroundOf(name: string) {
  return StyleSheet.flatten(screen.getByRole("button", { name }).props.style).backgroundColor;
}

describe("PhraseResultSheet の記録ボタン", () => {
  it("次の1本が無いときは「記録して次の1本へ」を出さず、「記録して今日は終わる」を主ボタンにする", () => {
    const { onSubmit } = setup(jest.fn(), 2, false);

    expect(screen.queryByRole("button", { name: "記録して次の1本へ" })).toBeNull();
    expect(backgroundOf("記録して今日は終わる")).toBe(colors.primary);

    fireEvent.press(screen.getByRole("button", { name: "記録して今日は終わる" }));
    expect(onSubmit).toHaveBeenCalledWith({ result: "ok" }, "finish");
  });

  it("次の1本があるときは「記録して次の1本へ」が主ボタンで、「今日は終わる」は副ボタン", () => {
    setup(jest.fn(), 2, true);

    expect(backgroundOf("記録して次の1本へ")).toBe(colors.primary);
    expect(backgroundOf("記録して今日は終わる")).not.toBe(colors.primary);
  });
});
