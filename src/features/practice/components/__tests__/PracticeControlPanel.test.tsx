import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ABLoop } from "@/shared/types/models";
import { PracticeControlPanel } from "../PracticeControlPanel";

// 保存ボタン周りだけを見るため、Reanimated を使う子は描画しない
jest.mock("../PracticeSeekBar", () => ({ PracticeSeekBar: () => null }));
jest.mock("../MetronomeControls", () => ({ MetronomeControls: () => null }));

const VALID_LOOP: ABLoop = { pointA: 10, pointB: 20, enabled: true };

function renderPanel({ abLoop, hasNoPhrases }: { abLoop: ABLoop; hasNoPhrases: boolean }) {
  const onOpenSavePhrase = jest.fn();
  render(
    <PracticeControlPanel
      abLoop={abLoop}
      currentTimeShared={{ value: 0 } as never}
      duration={120}
      onToggleLoop={jest.fn()}
      onClearLoop={jest.fn()}
      onTapPoint={jest.fn()}
      onSetPoint={jest.fn()}
      onScrubStart={jest.fn()}
      onScrubEnd={jest.fn()}
      onScrubCancel={jest.fn()}
      scrubbingRef={{ current: false }}
      bookmarkCount={0}
      onAddBookmark={jest.fn()}
      onOpenSavePhrase={onOpenSavePhrase}
      hasNoPhrases={hasNoPhrases}
      metronomeBpm={100}
      metronomeEnabled={false}
      metronomeActiveBeat={0}
      metronomeBeatsPerBar={4}
      onStepMetronomeBpm={jest.fn()}
      onToggleMetronome={jest.fn()}
      phraseProgress={null}
    />,
  );
  return { onOpenSavePhrase };
}

describe("PracticeControlPanel の「フレーズとして保存」の文字ラベル", () => {
  it("フレーズ0本でA/Bが有効な区間なら文字を出し、押すと保存シートを開く", () => {
    const { onOpenSavePhrase } = renderPanel({ abLoop: VALID_LOOP, hasNoPhrases: true });
    fireEvent.press(screen.getByText("フレーズとして保存"));
    expect(onOpenSavePhrase).toHaveBeenCalledTimes(1);
  });

  it("フレーズが1本以上あるときは出さない", () => {
    renderPanel({ abLoop: VALID_LOOP, hasNoPhrases: false });
    expect(screen.queryByText("フレーズとして保存")).toBeNull();
  });

  it("フレーズ0本でもA/Bが有効な区間でなければ出さない", () => {
    renderPanel({ abLoop: { pointA: 10, pointB: null, enabled: false }, hasNoPhrases: true });
    expect(screen.queryByText("フレーズとして保存")).toBeNull();
  });
});
