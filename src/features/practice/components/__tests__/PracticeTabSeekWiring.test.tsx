import { act, render } from "@testing-library/react-native";
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

type PanelProps = {
  onScrubStart: () => void;
  onScrubEnd: (time: number) => void;
  onScrubCancel: () => void;
  onTapPoint: (point: "A" | "B") => void;
};
type MenuProps = { onSeekBookmark: (time: number) => void };

const mockPlayer = {
  posted: [] as Record<string, unknown>[],
  onDurationReady: null as ((duration: number) => void) | null,
};
const mockChildren = { panel: null as PanelProps | null, menu: null as MenuProps | null };

jest.mock("../VideoPlayerCard", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    VideoPlayerCard: React.forwardRef(function MockPlayer(
      props: { onDurationReady: (duration: number) => void },
      ref: React.Ref<unknown>,
    ) {
      React.useImperativeHandle(ref, () => ({
        postMessage: (data: string) => mockPlayer.posted.push(JSON.parse(data)),
      }));
      mockPlayer.onDurationReady = props.onDurationReady;
      return null;
    }),
  };
});
jest.mock("../PracticeControlPanel", () => ({
  PracticeControlPanel: (props: PanelProps) => {
    mockChildren.panel = props;
    return null;
  },
}));
jest.mock("../PracticeMenuSheet", () => ({
  PracticeMenuSheet: (props: MenuProps) => {
    mockChildren.menu = props;
    return null;
  },
}));
jest.mock("../PracticeSessionBar", () => ({ PracticeSessionBar: () => null }));
jest.mock("../PhraseResultSheet", () => ({ PhraseResultSheet: () => null }));
jest.mock("../SavePhraseSheet", () => ({ SavePhraseSheet: () => null }));

const initialState = usePracticeStore.getState();

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
  mockPlayer.posted = [];
  mockPlayer.onDurationReady = null;
  mockChildren.panel = null;
  mockChildren.menu = null;
});

/** 動画を読み込んで準備完了まで進め、それまでに送った命令は捨てる */
function renderReadyVideo(abLoop: { pointA: number | null; pointB: number | null }) {
  act(() => {
    usePracticeStore.getState().loadVideo("abc123def45", "テスト動画");
    usePracticeStore.getState().setABLoop({ enabled: false, ...abLoop });
  });
  render(<PracticeTab onOpenAddVideo={jest.fn()} />);
  act(() => {
    mockPlayer.onDurationReady?.(200);
  });
  mockPlayer.posted = [];
  const panel = mockChildren.panel;
  const menu = mockChildren.menu;
  if (!panel || !menu) throw new Error("コントロールパネルとメニューが描画されていない");
  return { panel, menu };
}

describe("PracticeTab のシークバー操作で送る命令", () => {
  it("ドラッグ開始で一時停止だけを送る", () => {
    const { panel } = renderReadyVideo({ pointA: null, pointB: null });

    act(() => panel.onScrubStart());

    expect(mockPlayer.posted).toEqual([{ action: "pause" }]);
  });

  it("離したらその位置へシークしてから再生する", () => {
    const { panel } = renderReadyVideo({ pointA: null, pointB: null });

    act(() => panel.onScrubEnd(30));

    expect(mockPlayer.posted).toEqual([{ action: "seek", time: 30 }, { action: "play" }]);
  });

  it("ドラッグが中断されたらシークせず再生だけ送る", () => {
    const { panel } = renderReadyVideo({ pointA: null, pointB: null });

    act(() => panel.onScrubCancel());

    expect(mockPlayer.posted).toEqual([{ action: "play" }]);
  });
});

describe("PracticeTab のA点・B点タップとブックマークで送る命令", () => {
  it.each([
    ["A", 10.3],
    ["B", 42.6],
  ] as const)("%s点をタップすると、その点の位置（%s秒）へシークする", (point, time) => {
    const { panel } = renderReadyVideo({ pointA: 10.3, pointB: 42.6 });

    act(() => panel.onTapPoint(point));

    expect(mockPlayer.posted).toEqual([{ action: "seek", time }]);
  });

  it("未設定の点をタップしても何も送らない", () => {
    const { panel } = renderReadyVideo({ pointA: null, pointB: null });

    act(() => panel.onTapPoint("A"));
    act(() => panel.onTapPoint("B"));

    expect(mockPlayer.posted).toEqual([]);
  });

  it("ブックマークを選ぶとその位置へシークする", () => {
    const { menu } = renderReadyVideo({ pointA: null, pointB: null });

    act(() => menu.onSeekBookmark(83));

    expect(mockPlayer.posted).toEqual([{ action: "seek", time: 83 }]);
  });
});
