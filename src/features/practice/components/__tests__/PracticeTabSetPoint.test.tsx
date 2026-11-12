import { AccessibilityInfo } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { usePracticeStore } from "@/stores/practice";
import { PracticeTab } from "../PracticeTab";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "uuid" }));
jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(async () => {}),
}));
jest.mock("@/features/practice/api/useAddRecentVideo", () => ({
  useAddRecentVideo: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/useSavePracticePhrase", () => ({
  useSavePracticePhrase: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/features/practice/api/useRecordPhraseResult", () => ({
  useRecordPhraseResult: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/features/practice/api/useGraduatePracticePhrase", () => ({
  useGraduatePracticePhrase: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: [] }),
}));
jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: [] }),
}));
jest.mock("@/features/practice/api/useVideoPresets", () => ({
  useVideoPresets: () => ({ data: [] }),
}));
jest.mock("@/features/reminder/hooks/useReminderPermissionPrompt", () => ({
  useReminderPermissionPrompt: () => jest.fn(),
}));
jest.mock("@/features/practice/hooks/usePhraseLongPressActions", () => ({
  usePhraseLongPressActions: () => jest.fn(),
}));
jest.mock("@/features/practice/hooks/useSaveTimerSession", () => ({
  useSaveTimerSession: () => ({ saveTimerSession: jest.fn(), isSaving: false }),
}));
jest.mock("@/features/practice/hooks/useCloseVideo", () => ({ useCloseVideo: () => jest.fn() }));
jest.mock("@/features/practice/hooks/usePausePlayerOnBlur", () => ({ usePausePlayerOnBlur: () => {} }));
jest.mock("@/features/practice/hooks/useMetronomeEngine", () => ({
  useMetronomeEngine: () => ({ bpm: 85, enabled: false, beatsPerBar: 4 }),
}));
jest.mock("@/shared/hooks/useKeepAwakeWhileFocused", () => ({ useKeepAwakeWhileFocused: () => {} }));
const mockPlayer = {
  onTimeUpdate: null as ((time: number) => void) | null,
  onDurationReady: null as ((duration: number) => void) | null,
};
jest.mock("../VideoPlayerCard", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    VideoPlayerCard: React.forwardRef(function MockPlayer(
      props: { onTimeUpdate: (time: number) => void; onDurationReady: (duration: number) => void },
      ref: React.Ref<unknown>,
    ) {
      React.useImperativeHandle(ref, () => ({ postMessage: () => {} }));
      mockPlayer.onTimeUpdate = props.onTimeUpdate;
      mockPlayer.onDurationReady = props.onDurationReady;
      return null;
    }),
  };
});
jest.mock("../PracticeSeekBar", () => ({ PracticeSeekBar: () => null }));
jest.mock("../MetronomeControls", () => ({ MetronomeControls: () => null }));
jest.mock("../PracticeSessionBar", () => ({ PracticeSessionBar: () => null }));
jest.mock("../PhraseResultSheet", () => ({ PhraseResultSheet: () => null }));
jest.mock("../SavePhraseSheet", () => ({ SavePhraseSheet: () => null }));

const initialState = usePracticeStore.getState();
let announceSpy: jest.SpyInstance;

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
  mockPlayer.onTimeUpdate = null;
  mockPlayer.onDurationReady = null;
  jest.mocked(Haptics.selectionAsync).mockClear();
  announceSpy = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
});

afterEach(() => {
  announceSpy.mockRestore();
});

function renderLoadedVideo(abLoop: { pointA: number | null; pointB: number | null }) {
  act(() => {
    usePracticeStore.getState().loadVideo("abc123def45", "テスト動画");
    usePracticeStore.getState().setABLoop({ ...abLoop, enabled: false });
  });
  render(<PracticeTab onOpenAddVideo={jest.fn()} />);
  act(() => {
    mockPlayer.onDurationReady?.(200);
  });
}

function playTo(time: number) {
  act(() => {
    mockPlayer.onTimeUpdate?.(time);
  });
}

function pointButton(point: "A" | "B") {
  return screen.getByLabelText(new RegExp(`^${point}点、`));
}

describe("PracticeTab のA点・B点の長押しで設定し直す時刻", () => {
  it("設定済みのA点を長押しすると、長押しが成立した時点ではなく指が触れた時点の再生位置をA点にする", () => {
    renderLoadedVideo({ pointA: 10, pointB: 100 });
    playTo(83.04);

    fireEvent(pointButton("A"), "pressIn");
    playTo(83.54);
    fireEvent(pointButton("A"), "longPress");

    expect(usePracticeStore.getState().abLoop.pointA).toBeCloseTo(83.0, 9);
  });

  it("設定済みのB点を長押しすると、指が触れた時点の再生位置をB点にする", () => {
    renderLoadedVideo({ pointA: 10, pointB: 20 });
    playTo(83.04);

    fireEvent(pointButton("B"), "pressIn");
    playTo(83.54);
    fireEvent(pointButton("B"), "longPress");

    expect(usePracticeStore.getState().abLoop.pointB).toBeCloseTo(83.1, 9);
  });

  it("未設定のA点をタップしたときは、タップが確定した時点の再生位置をA点にする", () => {
    renderLoadedVideo({ pointA: null, pointB: null });
    playTo(83.04);

    fireEvent(pointButton("A"), "pressIn");
    playTo(83.54);
    fireEvent.press(pointButton("A"));

    expect(usePracticeStore.getState().abLoop.pointA).toBeCloseTo(83.5, 9);
  });

  it("読み上げ用の「設定」操作では、操作した時点の再生位置をB点にする", () => {
    renderLoadedVideo({ pointA: 10, pointB: 20 });
    playTo(83.54);

    fireEvent(pointButton("B"), "accessibilityAction", { nativeEvent: { actionName: "longpress" } });

    expect(usePracticeStore.getState().abLoop.pointB).toBeCloseTo(83.6, 9);
  });
});

describe("PracticeTab のA点・B点を設定したときの手応え", () => {
  it("点を設定すると軽い振動と「A点を◯に設定」の読み上げを1回ずつ行う", () => {
    renderLoadedVideo({ pointA: 10, pointB: 100 });
    playTo(83.04);

    fireEvent(pointButton("A"), "pressIn");
    fireEvent(pointButton("A"), "longPress");

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenCalledWith("A点を1分23秒に設定");
  });

  it("設定済みの点をタップして移動しただけのときは、振動も読み上げもしない", () => {
    renderLoadedVideo({ pointA: 10, pointB: 100 });
    playTo(83.04);

    fireEvent(pointButton("A"), "pressIn");
    fireEvent.press(pointButton("A"));

    expect(usePracticeStore.getState().abLoop.pointA).toBe(10);
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(announceSpy).not.toHaveBeenCalled();
  });
});
