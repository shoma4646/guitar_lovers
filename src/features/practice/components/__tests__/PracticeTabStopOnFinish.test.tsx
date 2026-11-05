import { act, render } from "@testing-library/react-native";
import { Alert } from "react-native";
import { usePracticeStore } from "@/stores/practice";
import type { PracticePhrase } from "@/shared/types/models";
import { PracticeTab } from "../PracticeTab";

const PHRASE: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "テスト動画",
  name: "イントロ",
  startSec: 10,
  endSec: 20,
  currentBpm: 80,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};
const SECOND: PracticePhrase = { ...PHRASE, id: "p2", name: "Aメロ", startSec: 30, endSec: 40 };

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
jest.mock("@/features/practice/api/useAddRecentVideo", () => ({
  useAddRecentVideo: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/useSavePracticePhrase", () => ({
  useSavePracticePhrase: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/features/practice/api/useRecordPhraseResult", () => ({
  useRecordPhraseResult: () => ({ mutateAsync: jest.fn(async () => {}) }),
}));
jest.mock("@/features/practice/api/useGraduatePracticePhrase", () => ({
  useGraduatePracticePhrase: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: [] }),
}));
let mockPhrases: PracticePhrase[] = [PHRASE, SECOND];
jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: mockPhrases }),
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
jest.mock("@/features/practice/hooks/useMetronomeEngine", () => {
  const { usePracticeStore: store } = jest.requireActual<typeof import("@/stores/practice")>("@/stores/practice");
  return {
    useMetronomeEngine: () => ({
      bpm: store((s) => s.metronomeBpm),
      enabled: store((s) => s.metronomeEnabled),
     
      beatsPerBar: 4,
    }),
  };
});
const mockKeepAwake = { active: null as boolean | null };
jest.mock("@/shared/hooks/useKeepAwakeWhileFocused", () => ({
  useKeepAwakeWhileFocused: (active: boolean) => {
    mockKeepAwake.active = active;
  },
}));
const mockPlayer = {
  posted: [] as Record<string, unknown>[],
  onDurationReady: null as ((duration: number) => void) | null,
};
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
jest.mock("../PracticeControlPanel", () => ({ PracticeControlPanel: () => null }));
const mockSessionBar = { onFinish: null as (() => void) | null };
jest.mock("../PracticeSessionBar", () => ({
  PracticeSessionBar: (props: { onFinish: () => void }) => {
    mockSessionBar.onFinish = props.onFinish;
    return null;
  },
}));
type ResultSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: { result: "ok" | "partial" | "ng" }, action: "next" | "finish") => Promise<void>;
};
const mockResultSheet: { props: ResultSheetProps | null } = { props: null };
jest.mock("../PhraseResultSheet", () => ({
  PhraseResultSheet: (props: ResultSheetProps) => {
    mockResultSheet.props = props;
    return null;
  },
}));
jest.mock("../SavePhraseSheet", () => ({ SavePhraseSheet: () => null }));

const initialState = usePracticeStore.getState();

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
  mockPhrases = [PHRASE, SECOND];
  mockPlayer.posted = [];
  mockPlayer.onDurationReady = null;
  mockSessionBar.onFinish = null;
  mockResultSheet.props = null;
  mockKeepAwake.active = null;
});

function resultSheet(): ResultSheetProps {
  if (!mockResultSheet.props) throw new Error("結果シートが描画されていない");
  return mockResultSheet.props;
}

/** フレーズ練習を始め、プレイヤーを準備済みにしてから「終了」を押す */
function startPracticeAndFinish({ metronomeEnabled }: { metronomeEnabled: boolean }) {
  act(() => {
    usePracticeStore.getState().startPhrasePractice(PHRASE, 85);
    usePracticeStore.getState().setMetronomeEnabled(metronomeEnabled);
  });
  render(<PracticeTab onOpenAddVideo={jest.fn()} />);
  act(() => {
    mockPlayer.onDurationReady?.(200);
  });
  mockPlayer.posted = [];
  act(() => {
    mockSessionBar.onFinish?.();
  });
}

describe("PracticeTab の練習終了時の再生・メトロノーム", () => {
  it("「終了」を押すと動画を一時停止し、メトロノームを止める", () => {
    startPracticeAndFinish({ metronomeEnabled: true });

    expect(resultSheet().visible).toBe(true);
    expect(mockPlayer.posted).toContainEqual({ action: "pause" });
    expect(usePracticeStore.getState().metronomeEnabled).toBe(false);
  });

  it.each([true, false])(
    "記録せずに結果シートを閉じると再生を再開し、メトロノームを押す前のON/OFF（%s）に戻す",
    (metronomeEnabled) => {
      startPracticeAndFinish({ metronomeEnabled });
      mockPlayer.posted = [];

      act(() => {
        resultSheet().onClose();
      });

      expect(resultSheet().visible).toBe(false);
      expect(mockPlayer.posted).toContainEqual({ action: "play" });
      expect(usePracticeStore.getState().metronomeEnabled).toBe(metronomeEnabled);
      expect(usePracticeStore.getState().activePhrasePractice?.phrase.id).toBe("p1");
    },
  );

  it("「記録して今日は終わる」の後はメトロノームが止まったままで、画面ロックの抑止も解除される", async () => {
    startPracticeAndFinish({ metronomeEnabled: true });
    mockPlayer.posted = [];

    await act(async () => {
      await resultSheet().onSubmit({ result: "ok" }, "finish");
    });

    expect(usePracticeStore.getState().metronomeEnabled).toBe(false);
    expect(usePracticeStore.getState().activePhrasePractice).toBeNull();
    expect(mockKeepAwake.active).toBe(false);
    expect(mockPlayer.posted).not.toContainEqual({ action: "play" });
  });

  it.each([true, false])(
    "「記録して次の1本へ」の後は次のフレーズを再生し、メトロノームを押す前のON/OFF（%s）に戻す",
    async (metronomeEnabled) => {
      const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      startPracticeAndFinish({ metronomeEnabled });
      mockPlayer.posted = [];

      await act(async () => {
        await resultSheet().onSubmit({ result: "ok" }, "next");
      });

      expect(usePracticeStore.getState().activePhrasePractice?.phrase.id).toBe("p2");
      expect(mockPlayer.posted).toContainEqual({ action: "seek", time: 30 });
      expect(mockPlayer.posted).toContainEqual({ action: "play" });
      expect(usePracticeStore.getState().metronomeEnabled).toBe(metronomeEnabled);
      alertSpy.mockRestore();
    },
  );
});
