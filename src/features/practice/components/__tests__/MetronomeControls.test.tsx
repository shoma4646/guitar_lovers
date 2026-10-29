import { fireEvent, render, screen } from "@testing-library/react-native";
import { BPM_MAX, BPM_MIN } from "@/shared/constants/bpm";
import { MetronomeControls } from "../MetronomeControls";

function setup(bpm = 120) {
  const onStepBpm = jest.fn();
  render(
    <MetronomeControls
      bpm={bpm}
      enabled={false}
      activeBeat={0}
      beatsPerBar={4}
      onStepBpm={onStepBpm}
      onToggleEnabled={jest.fn()}
    />,
  );
  return { onStepBpm };
}

describe("MetronomeControls の読み上げ", () => {
  it("BPM表示は調整可能な要素で、現在値を「N BPM」として持つ", () => {
    setup(120);
    const tempo = screen.getByRole("adjustable", { name: "メトロノームのテンポ" });
    expect(tempo.props.accessibilityValue).toEqual({
      min: BPM_MIN,
      max: BPM_MAX,
      now: 120,
      text: "120 BPM",
    });
  });

  it("increment で onStepBpm(1)、decrement で onStepBpm(-1) が呼ばれる", () => {
    const { onStepBpm } = setup();
    const tempo = screen.getByRole("adjustable", { name: "メトロノームのテンポ" });

    fireEvent(tempo, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(onStepBpm).toHaveBeenLastCalledWith(1);

    fireEvent(tempo, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(onStepBpm).toHaveBeenLastCalledWith(-1);
    expect(onStepBpm).toHaveBeenCalledTimes(2);
  });

  it("−／＋ボタンのラベルに「長押し」を含めず、長押しの説明はヒントに置く", () => {
    setup();
    const dec = screen.getByRole("button", { name: "メトロノームBPMを1下げる" });
    const inc = screen.getByRole("button", { name: "メトロノームBPMを1上げる" });
    for (const button of [dec, inc]) {
      expect(button.props.accessibilityLabel).not.toContain("長押し");
      expect(button.props.accessibilityHint).toContain("長押し");
    }
  });
});
