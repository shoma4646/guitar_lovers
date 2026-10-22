import { fireEvent, render, screen, within } from "@testing-library/react-native";
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

function setup(onSubmit = jest.fn()) {
  render(
    <PhraseResultSheet
      visible
      phrase={phrase}
      bpm={85}
      progress={null}
      phraseElapsedSeconds={60}
      completedReps={2}
      onChangeCompletedReps={jest.fn()}
      isSubmitting={false}
      onClose={jest.fn()}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit };
}

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
