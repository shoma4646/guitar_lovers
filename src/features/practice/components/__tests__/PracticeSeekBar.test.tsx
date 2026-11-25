import { fireEvent, render, screen } from "@testing-library/react-native";
import * as fc from "fast-check";
import { View } from "react-native";
import { PracticeSeekBar } from "../PracticeSeekBar";

// 共通モックのuseSharedValueは描画ごとに新しい値を返し、useDerivedValue内のsetStateが無限に再描画するため
jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  const { useEffect, useRef } = jest.requireActual<typeof import("react")>("react");
  return {
    __esModule: true,
    default: { View },
    runOnJS: (fn: unknown) => fn,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (initial: unknown) => useRef({ value: initial }).current,
    useDerivedValue: (factory: () => unknown) => {
      useEffect(() => {
        factory();
      });
    },
  };
});

describe("PracticeSeekBar のアクセシビリティ", () => {
  it("再生位置として1要素にまとまり、値を読み上げ用の文字列でも持つ", () => {
    render(
      <PracticeSeekBar
        currentTimeShared={{ value: 72 } as never}
        duration={220}
        abLoop={{ pointA: null, pointB: null, enabled: false }}
        onScrubStart={jest.fn()}
        onScrubEnd={jest.fn()}
        onScrubCancel={jest.fn()}
      />,
    );
    const seekBar = screen.getByRole("adjustable", { name: "再生位置" });
    expect(seekBar.props.accessible).toBe(true);
    expect(seekBar.props.accessibilityValue).toEqual({
      min: 0,
      max: 220,
      now: 72,
      text: "1分12秒 / 3分40秒",
    });
  });
});

describe("PracticeSeekBar のドラッグ", () => {
  it("ドラッグ中に親のスクロールから譲るよう求められても応じない", () => {
    render(
      <PracticeSeekBar
        currentTimeShared={{ value: 0 } as never}
        duration={220}
        abLoop={{ pointA: null, pointB: null, enabled: false }}
        onScrubStart={jest.fn()}
        onScrubEnd={jest.fn()}
        onScrubCancel={jest.fn()}
      />,
    );
    const seekBar = screen.getByRole("adjustable", { name: "再生位置" });
    expect(seekBar.props.onResponderTerminationRequest({ nativeEvent: {}, touchHistory: {} })).toBe(false);
  });
});

type Handlers = { onScrubStart: jest.Mock; onScrubEnd: jest.Mock; onScrubCancel: jest.Mock };

let mounted: { view: ReturnType<typeof render>; key: number } | null = null;

afterEach(() => {
  mounted = null;
});

/** 同じテスト内の2回目以降は key を変えて作り直す（cleanup 後の render は react-test-renderer が受け付けない） */
function renderSeekBar({ width, duration, now = 0 }: { width: number; duration: number; now?: number }) {
  const handlers: Handlers = { onScrubStart: jest.fn(), onScrubEnd: jest.fn(), onScrubCancel: jest.fn() };
  const currentTimeShared = { value: now };
  const key = (mounted?.key ?? 0) + 1;
  const element = (
    <View>
      <PracticeSeekBar
        key={key}
        currentTimeShared={currentTimeShared as never}
        duration={duration}
        abLoop={{ pointA: null, pointB: null, enabled: false }}
        {...handlers}
      />
    </View>
  );
  if (mounted) {
    mounted.view.rerender(element);
    mounted.key = key;
  } else {
    mounted = { view: render(element), key };
  }
  const { view } = mounted;
  const seekBar = screen.getByRole("adjustable", { name: "再生位置" });
  fireEvent(seekBar, "layout", { nativeEvent: { layout: { x: 0, y: 0, width, height: 44 } } });
  return { ...handlers, seekBar, currentTimeShared, rerender: () => view.rerender(element) };
}

let touchTimestamp = 0;

/** PanResponder が重心の計算に使う1本指のタッチ履歴を添えたイベント */
function touchEvent(locationX: number) {
  touchTimestamp += 1;
  const touch = {
    touchActive: true,
    startPageX: locationX,
    startPageY: 0,
    startTimeStamp: touchTimestamp,
    currentPageX: locationX,
    currentPageY: 0,
    currentTimeStamp: touchTimestamp,
    previousPageX: locationX,
    previousPageY: 0,
    previousTimeStamp: touchTimestamp,
  };
  return {
    nativeEvent: { locationX, locationY: 22, touches: [], changedTouches: [] },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: touchTimestamp,
      touchBank: [touch],
    },
  };
}

function drag(seekBar: ReturnType<typeof screen.getByRole>, xs: number[], end: "release" | "terminate" = "release") {
  const [first, ...rest] = xs;
  fireEvent(seekBar, "responderGrant", touchEvent(first));
  for (const x of rest) fireEvent(seekBar, "responderMove", touchEvent(x));
  fireEvent(seekBar, end === "release" ? "responderRelease" : "responderTerminate", touchEvent(xs[xs.length - 1]));
}

describe("PracticeSeekBar のドラッグで決める再生位置", () => {
  it.each([
    [100, 120],
    [-50, 0],
    [300, 240],
  ])("幅200・長さ240秒で x=%s から離すと onScrubEnd(%s) を1回だけ呼ぶ", (x, expected) => {
    const { seekBar, onScrubEnd } = renderSeekBar({ width: 200, duration: 240 });

    drag(seekBar, [x]);

    expect(onScrubEnd).toHaveBeenCalledTimes(1);
    expect(onScrubEnd).toHaveBeenCalledWith(expected);
  });

  it("ドラッグで動かしたあとは、離した時点の位置で onScrubEnd を呼ぶ", () => {
    const { seekBar, onScrubEnd } = renderSeekBar({ width: 200, duration: 240 });

    drag(seekBar, [20, 80, 150]);

    expect(onScrubEnd).toHaveBeenCalledTimes(1);
    expect(onScrubEnd).toHaveBeenCalledWith(180);
  });

  it("ドラッグ開始で onScrubStart を呼び、離したときに onScrubCancel は呼ばない", () => {
    const { seekBar, onScrubStart, onScrubEnd, onScrubCancel } = renderSeekBar({ width: 200, duration: 240 });

    fireEvent(seekBar, "responderGrant", touchEvent(100));
    expect(onScrubStart).toHaveBeenCalledTimes(1);
    expect(onScrubEnd).not.toHaveBeenCalled();

    fireEvent(seekBar, "responderRelease", touchEvent(100));
    expect(onScrubCancel).not.toHaveBeenCalled();
  });

  it("ドラッグが中断されたら onScrubEnd ではなく onScrubCancel を呼ぶ", () => {
    const { seekBar, onScrubStart, onScrubEnd, onScrubCancel } = renderSeekBar({ width: 200, duration: 240 });

    drag(seekBar, [100, 150], "terminate");

    expect(onScrubStart).toHaveBeenCalledTimes(1);
    expect(onScrubCancel).toHaveBeenCalledTimes(1);
    expect(onScrubEnd).not.toHaveBeenCalled();
  });

  it("幅 w・長さ d・タッチ x（-w〜2w）で離すと clamp(x/w,0,1)*d 秒になり 0〜d に収まる", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1000, noNaN: true }),
        fc.double({ min: 1, max: 36000, noNaN: true }),
        fc.double({ min: -1, max: 2, noNaN: true }),
        (w, d, xRatio) => {
          const x = xRatio * w;
          const { seekBar, onScrubEnd } = renderSeekBar({ width: w, duration: d });

          drag(seekBar, [x]);

          const time = onScrubEnd.mock.calls[0][0] as number;
          expect(time).toBeCloseTo(Math.max(0, Math.min(1, x / w)) * d, 6);
          expect(time).toBeGreaterThanOrEqual(0);
          expect(time).toBeLessThanOrEqual(d);
        },
      ),
      { numRuns: 50 },
    );
  });
});

describe("PracticeSeekBar の読み上げ操作（5秒進める・戻す）", () => {
  function accessibilityAction(seekBar: ReturnType<typeof screen.getByRole>, actionName: "increment" | "decrement") {
    fireEvent(seekBar, "accessibilityAction", { nativeEvent: { actionName } });
  }

  it("再生位置72秒・長さ220秒で、進めるは onScrubEnd(77)、戻すは onScrubEnd(67)", () => {
    const { seekBar, onScrubStart, onScrubEnd } = renderSeekBar({ width: 200, duration: 220, now: 72 });

    accessibilityAction(seekBar, "increment");
    expect(onScrubEnd).toHaveBeenLastCalledWith(77);

    accessibilityAction(seekBar, "decrement");
    expect(onScrubEnd).toHaveBeenLastCalledWith(67);
    expect(onScrubStart).toHaveBeenCalledTimes(2);
  });

  it("長さの近くで進めると長さで止まり、0の近くで戻すと0で止まる", () => {
    const nearEnd = renderSeekBar({ width: 200, duration: 220, now: 218 });
    accessibilityAction(nearEnd.seekBar, "increment");
    expect(nearEnd.onScrubEnd).toHaveBeenLastCalledWith(220);

    const nearStart = renderSeekBar({ width: 200, duration: 220, now: 2 });
    accessibilityAction(nearStart.seekBar, "decrement");
    expect(nearStart.onScrubEnd).toHaveBeenLastCalledWith(0);
  });

  it("何回続けても 0〜長さ に収まり、進めるで値は減らない", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 36000 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.array(fc.constantFrom("increment" as const, "decrement" as const), { minLength: 1, maxLength: 20 }),
        (d, startRatio, actions) => {
          const bar = renderSeekBar({ width: 200, duration: d, now: startRatio * d });
          for (const actionName of actions) {
            const before = Math.floor(bar.currentTimeShared.value);
            accessibilityAction(bar.seekBar, actionName);
            const next = bar.onScrubEnd.mock.lastCall?.[0] as number;
            expect(next).toBeGreaterThanOrEqual(0);
            expect(next).toBeLessThanOrEqual(d);
            if (actionName === "increment") expect(next).toBeGreaterThanOrEqual(before);
            bar.currentTimeShared.value = next;
            bar.rerender();
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
