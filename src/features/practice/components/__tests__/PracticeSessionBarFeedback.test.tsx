import { useState } from "react";
import { AccessibilityInfo, Pressable, Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import type { ActivePhrasePractice } from "@/stores/practice";
import { PracticeSessionBar } from "../PracticeSessionBar";

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: "success" },
}));

const REACHED_MESSAGE = "目安の3回に達しました。終了で記録できます";

function Harness({ initialReps = 0, startedAt = 1000 }: { initialReps?: number; startedAt?: number }) {
  const [practice, setPractice] = useState({
    goalBpm: 100,
    targetReps: 3,
    completedReps: initialReps,
    startedAt,
  } as ActivePhrasePractice);
  const step = (delta: number) => {
    const completedReps = Math.max(0, practice.completedReps + delta);
    setPractice({ ...practice, completedReps });
    return completedReps;
  };
  return (
    <>
      <PracticeSessionBar
        practice={practice}
        metronomeBpm={100}
        onIncrement={() => step(1)}
        onDecrement={() => step(-1)}
        onFinish={jest.fn()}
      />
      <TestRestart onRestart={() => setPractice({ ...practice, completedReps: 0, startedAt: practice.startedAt + 1 })} />
    </>
  );
}

function TestRestart({ onRestart }: { onRestart: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="練習をやり直す" onPress={onRestart}>
      <Text>やり直す</Text>
    </Pressable>
  );
}

const pressIncrement = () => fireEvent.press(screen.getByRole("button", { name: /^1回弾いた/ }));
const pressDecrement = () => fireEvent.press(screen.getByRole("button", { name: "回数を1減らす" }));

describe("PracticeSessionBar の押した手応え", () => {
  let announceSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    announceSpy = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
  });

  afterEach(() => {
    announceSpy.mockRestore();
  });

  it("「+1回」のたびに selection の振動と「N回」の読み上げが1回ずつ起きる", () => {
    render(<Harness />);

    pressIncrement();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenLastCalledWith("1回");

    pressIncrement();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2);
    expect(announceSpy).toHaveBeenCalledTimes(2);
    expect(announceSpy).toHaveBeenLastCalledWith("2回");
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("目安回数ちょうどに達したときだけ Success の振動と達成の読み上げが起きる", () => {
    render(<Harness initialReps={2} />);

    pressIncrement();

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenLastCalledWith(`3回。${REACHED_MESSAGE}`);
  });

  it("目安回数を超えた後は達成の振動・読み上げを繰り返さない", () => {
    render(<Harness initialReps={2} />);

    pressIncrement();
    pressIncrement();

    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenLastCalledWith("4回");
  });

  it("−1回で目安回数に戻ったときも、そこから+1回で再び達したときも達成は繰り返さない", () => {
    render(<Harness initialReps={2} />);

    pressIncrement();
    pressIncrement();
    pressDecrement();
    expect(announceSpy).toHaveBeenLastCalledWith("3回");
    pressDecrement();
    pressIncrement();

    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenLastCalledWith("3回");
  });

  it("練習をやり直せば、新しい練習で目安回数に達したときに再び達成を伝える", () => {
    render(<Harness initialReps={2} />);
    pressIncrement();

    fireEvent.press(screen.getByRole("button", { name: "練習をやり直す" }));
    pressIncrement();
    pressIncrement();
    pressIncrement();

    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
    expect(announceSpy).toHaveBeenLastCalledWith(`3回。${REACHED_MESSAGE}`);
  });

  it("「−1回」で減らした後の「N回」が読まれ、振動はしない", () => {
    render(<Harness initialReps={2} />);

    pressDecrement();

    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenLastCalledWith("1回");
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("0回のときに「−1回」を押しても何も起きない", () => {
    const onDecrement = jest.fn(() => 0);
    render(
      <PracticeSessionBar
        practice={{ goalBpm: 100, targetReps: 3, completedReps: 0, startedAt: 1000 } as ActivePhrasePractice}
        metronomeBpm={100}
        onIncrement={jest.fn(() => 1)}
        onDecrement={onDecrement}
        onFinish={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "回数を1減らす" }));

    expect(onDecrement).not.toHaveBeenCalled();
    expect(announceSpy).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});
