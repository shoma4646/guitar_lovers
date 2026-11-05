import { act, renderHook } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { usePracticeStore } from "@/stores/practice";
import { useMetronomeBeatStore } from "@/stores/metronomeBeat";
import { useMetronomeEngine } from "../useMetronomeEngine";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: "light" },
}));
jest.mock("react-native-audio-api", () => ({
  AudioManager: { setAudioSessionOptions: jest.fn() },
  AudioContext: jest.fn().mockImplementation(() => ({
    get currentTime() {
      return Date.now() / 1000;
    },
    close: jest.fn(async () => {}),
  })),
}));
jest.mock("@/features/practice/lib/metronomeClick", () => ({ scheduleClick: jest.fn() }));
jest.mock("../useStopMetronomeOnBlur", () => ({ useStopMetronomeOnBlur: () => {} }));

beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
  (Haptics.impactAsync as jest.Mock).mockClear();
  useMetronomeBeatStore.setState({ activeBeat: 0 });
  act(() => {
    usePracticeStore.getState().setMetronomeBpm(120);
    usePracticeStore.getState().setMetronomeEnabled(false);
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useMetronomeEngine", () => {
  it("拍が進んでもフックを呼んだコンポーネントは描き直されず、拍のストアと触覚フィードバックだけが毎拍動く", () => {
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useMetronomeEngine();
    });
    act(() => usePracticeStore.getState().setMetronomeEnabled(true));
    const rendersAfterEnable = renders;

    const seenBeats: number[] = [];
    const unsubscribe = useMetronomeBeatStore.subscribe((s) => seenBeats.push(s.activeBeat));
    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    unsubscribe();

    expect(renders).toBe(rendersAfterEnable);
    // 120BPMで2秒 = 4拍（最初の拍は開始から0.05秒後）
    expect(seenBeats).toEqual([0, 1, 2, 3]);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(4);
  });

  it("OFFにすると拍の表示は先頭に戻る", () => {
    renderHook(() => useMetronomeEngine());
    act(() => usePracticeStore.getState().setMetronomeEnabled(true));
    act(() => {
      jest.advanceTimersByTime(1_200);
    });
    expect(useMetronomeBeatStore.getState().activeBeat).toBe(2);

    act(() => usePracticeStore.getState().setMetronomeEnabled(false));
    expect(useMetronomeBeatStore.getState().activeBeat).toBe(0);
  });
});
