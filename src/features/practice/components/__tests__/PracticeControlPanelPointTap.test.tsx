import { fireEvent, render, screen } from "@testing-library/react-native";
import { PracticeControlPanel } from "../PracticeControlPanel";

jest.mock("../PracticeSeekBar", () => ({ PracticeSeekBar: () => null }));
jest.mock("../MetronomeControls", () => ({ MetronomeControls: () => null }));

function renderPanel() {
  const onTapPoint = jest.fn();
  const onSetPoint = jest.fn();
  render(
    <PracticeControlPanel
      abLoop={{ pointA: 10, pointB: 20, enabled: true }}
      currentTimeShared={{ value: 0 } as never}
      duration={120}
      onToggleLoop={jest.fn()}
      onClearLoop={jest.fn()}
      isAtActivePhraseRange={false}
      onTapPoint={onTapPoint}
      onPressInPoint={jest.fn()}
      onSetPoint={onSetPoint}
      onScrubStart={jest.fn()}
      onScrubEnd={jest.fn()}
      onScrubCancel={jest.fn()}
      bookmarkCount={0}
      onAddBookmark={jest.fn()}
      onOpenSavePhrase={jest.fn()}
      hasNoPhrases={false}
      metronomeBpm={100}
      metronomeEnabled={false}
      metronomeBeatsPerBar={4}
      onStepMetronomeBpm={jest.fn()}
      onToggleMetronome={jest.fn()}
      phraseProgress={null}
    />,
  );
  return { onTapPoint, onSetPoint };
}

describe("PracticeControlPanel のA点・B点ボタンのタップ", () => {
  it.each(["A", "B"] as const)("設定済みの「%s点」をタップすると、その点を指定して onTapPoint を呼ぶ", (point) => {
    const { onTapPoint, onSetPoint } = renderPanel();

    fireEvent.press(screen.getByLabelText(new RegExp(`^${point}点、`)));

    expect(onTapPoint).toHaveBeenCalledTimes(1);
    expect(onTapPoint).toHaveBeenCalledWith(point);
    expect(onSetPoint).not.toHaveBeenCalled();
  });
});
