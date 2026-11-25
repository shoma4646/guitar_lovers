import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { colors } from "@/shared/theme";
import type { ABLoop } from "@/shared/types/models";
import { PracticeControlPanel } from "../PracticeControlPanel";

// 保存ボタン周りだけを見るため、Reanimated を使う子は描画しない
jest.mock("../PracticeSeekBar", () => ({ PracticeSeekBar: () => null }));
jest.mock("../MetronomeControls", () => ({ MetronomeControls: () => null }));

const VALID_LOOP: ABLoop = { pointA: 10, pointB: 20, enabled: true };

function renderPanel({
  abLoop,
  hasNoPhrases,
  isAtActivePhraseRange = false,
  onToggleLoop = jest.fn(),
  duration = 120,
}: {
  abLoop: ABLoop;
  hasNoPhrases: boolean;
  duration?: number;
  isAtActivePhraseRange?: boolean;
  onToggleLoop?: () => void;
}) {
  const onOpenSavePhrase = jest.fn();
  render(
    <PracticeControlPanel
      abLoop={abLoop}
      currentTimeShared={{ value: 0 } as never}
      duration={duration}
      onToggleLoop={onToggleLoop}
      onClearLoop={jest.fn()}
      isAtActivePhraseRange={isAtActivePhraseRange}
      onTapPoint={jest.fn()}
      onPressInPoint={jest.fn()}
      onSetPoint={jest.fn()}
      onScrubStart={jest.fn()}
      onScrubEnd={jest.fn()}
      onScrubCancel={jest.fn()}
      bookmarkCount={0}
      onAddBookmark={jest.fn()}
      onOpenSavePhrase={onOpenSavePhrase}
      hasNoPhrases={hasNoPhrases}
      metronomeBpm={100}
      metronomeEnabled={false}
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

describe("PracticeControlPanel のABループ解除ボタン", () => {
  it("練習中フレーズの区間のままのときは「ABループを解除」を描画しない", () => {
    renderPanel({ abLoop: VALID_LOOP, hasNoPhrases: false, isAtActivePhraseRange: true });
    expect(screen.queryByRole("button", { name: "ABループを解除" })).toBeNull();
  });

  it("区間をフレーズから変えた後や、フレーズ練習中でないときは描画する", () => {
    renderPanel({ abLoop: VALID_LOOP, hasNoPhrases: false, isAtActivePhraseRange: false });
    expect(screen.getByRole("button", { name: "ABループを解除" })).toBeTruthy();
  });

  it("解除ボタンとスイッチの押せる範囲が重ならない（間隔8pt以上）", () => {
    renderPanel({ abLoop: VALID_LOOP, hasNoPhrases: false });
    const gap = StyleSheet.flatten(screen.getByTestId("ab-loop-header-actions").props.style).gap as number;
    const hitSlop = screen.getByRole("switch", { name: "ABループの有効・無効" }).props.hitSlop as {
      left?: number;
    };
    expect(gap - (hitSlop.left ?? 0)).toBeGreaterThanOrEqual(8);
  });
});

describe("PracticeControlPanel の見出し", () => {
  it("「ABループ」は見出しとして読まれる", () => {
    renderPanel({ abLoop: VALID_LOOP, hasNoPhrases: false });

    expect(screen.getByRole("header", { name: "ABループ" })).toBeTruthy();
    expect(screen.getAllByRole("header")).toHaveLength(1);
  });
});

describe("PracticeControlPanel のABループスイッチ", () => {
  it.each([
    [false, colors.outline],
    [true, colors.primary],
  ])("enabled=%s のトラックは共通トグルの色（%s）で、つまみは白", (enabled, trackColor) => {
    renderPanel({ abLoop: { ...VALID_LOOP, enabled }, hasNoPhrases: false });
    const toggle = screen.getByRole("switch", { name: "ABループの有効・無効" });
    expect(StyleSheet.flatten(toggle.props.style).backgroundColor).toBe(trackColor);
    const thumb = within(toggle).getByTestId("toggle-thumb");
    expect(StyleSheet.flatten(thumb.props.style).backgroundColor).toBe(colors.surfaceContainerLowest);
  });

  it("押すと onToggleLoop を呼ぶ", () => {
    const onToggleLoop = jest.fn();
    renderPanel({ abLoop: VALID_LOOP, hasNoPhrases: false, onToggleLoop });
    fireEvent.press(screen.getByRole("switch", { name: "ABループの有効・無効" }));
    expect(onToggleLoop).toHaveBeenCalledTimes(1);
  });

  it("区間が有効でなければ押せない", () => {
    const onToggleLoop = jest.fn();
    renderPanel({ abLoop: { pointA: 10, pointB: null, enabled: false }, hasNoPhrases: false, onToggleLoop });
    const toggle = screen.getByRole("switch", { name: "ABループの有効・無効" });
    fireEvent.press(toggle);
    expect(onToggleLoop).not.toHaveBeenCalled();
    expect(toggle.props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe("PracticeControlPanel のA/Bボタンの時刻表示", () => {
  it("1時間未満の動画では mm:ss で表示する", () => {
    renderPanel({ abLoop: VALID_LOOP, hasNoPhrases: false });
    expect(screen.getByText("A 00:10")).toBeTruthy();
    expect(screen.getByRole("button", { name: "A点、00:10へ移動" })).toBeTruthy();
  });

  it("1時間以上の動画では、1時間未満の点も時の桁付きで揃え、読み上げも同じ表記にする", () => {
    renderPanel({ abLoop: { pointA: 485, pointB: 4210, enabled: true }, hasNoPhrases: false, duration: 4500 });
    expect(screen.getByText("A 0:08:05")).toBeTruthy();
    expect(screen.getByText("B 1:10:10")).toBeTruthy();
    expect(screen.getByRole("button", { name: "A点、0:08:05へ移動" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "B点、1:10:10へ移動" })).toBeTruthy();
  });

  it("動画の長さが未取得（0）でも、点が1時間以上なら時の桁付きで揃える", () => {
    renderPanel({ abLoop: { pointA: 485, pointB: 4210, enabled: true }, hasNoPhrases: false, duration: 0 });
    expect(screen.getByText("A 0:08:05")).toBeTruthy();
  });
});
