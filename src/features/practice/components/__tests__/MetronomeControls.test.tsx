import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { colors } from "@/shared/theme";
import { useMetronomeBeatStore } from "@/stores/metronomeBeat";
import { BPM_MAX, BPM_MIN } from "@/shared/constants/bpm";
import { NUMERIC_MAX_FONT_SIZE_MULTIPLIER } from "@/shared/constants/layout";
import { MetronomeControls } from "../MetronomeControls";

function setup(bpm = 120) {
  const onStepBpm = jest.fn();
  render(
    <MetronomeControls
      bpm={bpm}
      enabled={false}
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

describe("MetronomeControls の文字サイズ拡大", () => {
  it("BPMの数値は文字サイズの拡大に上限を付ける", () => {
    setup(120);
    expect(screen.getByTestId("metronome-bpm-value").props.maxFontSizeMultiplier).toBe(
      NUMERIC_MAX_FONT_SIZE_MULTIPLIER,
    );
  });
});

describe("MetronomeControls の拍インジケータ", () => {
  it("親を描き直さなくても、拍のストアが進むと点灯する拍が移る", () => {
    act(() => useMetronomeBeatStore.getState().setActiveBeat(0));
    render(
      <MetronomeControls bpm={120} enabled beatsPerBar={4} onStepBpm={jest.fn()} onToggleEnabled={jest.fn()} />,
    );
    const litDot = () =>
      screen.getAllByTestId(/^metronome-beat-dot-/).findIndex((dot) => {
        const style = Array.isArray(dot.props.style) ? Object.assign({}, ...dot.props.style) : dot.props.style;
        return style.backgroundColor === colors.primary;
      });
    expect(litDot()).toBe(0);

    act(() => useMetronomeBeatStore.getState().setActiveBeat(2));
    expect(litDot()).toBe(2);
  });
});
