import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { pressAndHold } from "@/shared/testing/pressAndHold";
import { useHoldRepeat } from "../useHoldRepeat";

function StepButton({ onStep }: { onStep: () => void }) {
  const hold = useHoldRepeat(onStep);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="1段進める"
      onPress={hold.onPress}
      onPressIn={hold.onPressIn}
      onPressOut={hold.onPressOut}
    >
      <Text>+</Text>
    </Pressable>
  );
}

function button() {
  return screen.getByRole("button", { name: "1段進める" });
}

describe("useHoldRepeat", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("1.05秒長押しして離すと、離したときのタップを数えず長押しの11段だけ進む", () => {
    const onStep = jest.fn();
    render(<StepButton onStep={onStep} />);

    pressAndHold(button(), 1050);

    expect(onStep).toHaveBeenCalledTimes(11);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([200, 500])("押して%dms後にunmountすると、以後onStepは呼ばれずタイマーも残らない", (pressedMs) => {
    const onStep = jest.fn();
    const { unmount } = render(<StepButton onStep={onStep} />);

    fireEvent(button(), "pressIn");
    act(() => {
      jest.advanceTimersByTime(pressedMs);
    });
    const callsBeforeUnmount = onStep.mock.calls.length;
    unmount();

    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(1000);
    expect(onStep).toHaveBeenCalledTimes(callsBeforeUnmount);
  });

  it("タップだけなら1段だけ進む", () => {
    const onStep = jest.fn();
    render(<StepButton onStep={onStep} />);

    fireEvent(button(), "pressIn");
    fireEvent(button(), "pressOut");
    fireEvent.press(button());

    expect(onStep).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
