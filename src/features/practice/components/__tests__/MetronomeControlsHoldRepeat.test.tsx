import { useCallback, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { BPM_MAX, BPM_MIN } from "@/shared/constants/bpm";
import { stepBpm } from "../../lib/tempo";
import { MetronomeControls } from "../MetronomeControls";

/** 親がBPMのstateを持ち、その時点のbpmを閉じ込めたハンドラを渡す（PracticeTabと同じ形） */
function Host({ initialBpm }: { initialBpm: number }) {
  const [bpm, setBpm] = useState(initialBpm);
  const handleStep = useCallback((delta: number) => setBpm(stepBpm(bpm, delta)), [bpm]);
  return (
    <MetronomeControls
      bpm={bpm}
      enabled={false}
      activeBeat={0}
      beatsPerBar={4}
      onStepBpm={handleStep}
      onToggleEnabled={jest.fn()}
    />
  );
}

const INC = "メトロノームBPMを1上げる";
const DEC = "メトロノームBPMを1下げる";

function currentBpm(): number | undefined {
  return screen.getByRole("adjustable", { name: "メトロノームのテンポ" }).props.accessibilityValue.now;
}

function hold(name: string, durationMs: number) {
  const button = screen.getByRole("button", { name });
  fireEvent(button, "pressIn");
  // act内の更新は抜けるまで反映されないため、実機と同じく1tickごとに再描画させる
  for (let elapsed = 0; elapsed < durationMs; elapsed += 10) {
    act(() => {
      jest.advanceTimersByTime(10);
    });
  }
  fireEvent(button, "pressOut");
}

describe("MetronomeControls の長押しリピート", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("100 BPMで「1上げる」を1.05秒押し続けると111になる", () => {
    render(<Host initialBpm={100} />);
    hold(INC, 1050);
    expect(currentBpm()).toBe(111);
  });

  it("「1下げる」の長押しも連続で下がる", () => {
    render(<Host initialBpm={100} />);
    hold(DEC, 1050);
    expect(currentBpm()).toBe(89);
  });

  it("上限で止まる", () => {
    render(<Host initialBpm={BPM_MAX - 2} />);
    hold(INC, 1050);
    expect(currentBpm()).toBe(BPM_MAX);
  });

  it("下限で止まる", () => {
    render(<Host initialBpm={BPM_MIN + 2} />);
    hold(DEC, 1050);
    expect(currentBpm()).toBe(BPM_MIN);
  });

  it("通常のタップ1回は±1だけ変わる", () => {
    render(<Host initialBpm={100} />);
    const inc = screen.getByRole("button", { name: INC });
    fireEvent(inc, "pressIn");
    fireEvent(inc, "pressOut");
    fireEvent.press(inc);
    expect(currentBpm()).toBe(101);

    const dec = screen.getByRole("button", { name: DEC });
    fireEvent(dec, "pressIn");
    fireEvent(dec, "pressOut");
    fireEvent.press(dec);
    expect(currentBpm()).toBe(100);
  });

  it("押すのをやめたら直ちに止まり、タイマーが残らない", () => {
    render(<Host initialBpm={100} />);
    hold(INC, 1050);
    expect(jest.getTimerCount()).toBe(0);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(currentBpm()).toBe(111);
  });
});
