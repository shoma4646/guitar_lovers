import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { usePracticeStore } from "@/stores/practice";
import { usePitchDetector } from "../usePitchDetector";

let focusEffect: (() => void | (() => void)) | null = null;

jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    focusEffect = effect;
  },
}));

// pitchy は ESM のみで配布されており jest で変換されないため、検出を使わないこのテストでは差し替える
jest.mock("pitchy", () => ({ PitchDetector: { forFloat32Array: jest.fn() } }));

const recorders: MockRecorder[] = [];

class MockRecorder {
  recording = false;
  stop = jest.fn(async () => {
    this.recording = false;
  });
  constructor() {
    recorders.push(this);
  }
  onError() {}
  onAudioReady() {}
  clearOnAudioReady() {}
  clearOnError() {}
  isRecording() {
    return this.recording;
  }
  async start() {
    this.recording = true;
    return { status: "success" as const };
  }
}

jest.mock("react-native-audio-api", () => ({
  AudioManager: {
    requestRecordingPermissions: jest.fn(async () => "Granted"),
    setAudioSessionOptions: jest.fn(),
  },
  AudioRecorder: jest.fn().mockImplementation(() => new MockRecorder()),
}));

async function renderFocused() {
  const hook = renderHook(() => usePitchDetector());
  let cleanup: void | (() => void) = undefined;
  await act(async () => {
    cleanup = focusEffect?.();
  });
  await waitFor(() => expect(hook.result.current.status).toBe("listening"));
  return { hook, blur: () => (typeof cleanup === "function" ? (cleanup as () => void)() : undefined) };
}

describe("usePitchDetector とメトロノーム", () => {
  beforeEach(() => {
    focusEffect = null;
    recorders.length = 0;
  });

  it("検出を開始するとメトロノームをOFFにする", async () => {
    usePracticeStore.getState().setMetronomeEnabled(true);
    await renderFocused();
    expect(usePracticeStore.getState().metronomeEnabled).toBe(false);
  });

  it("メトロノームOFFで開始したあと一時停止してもOFFのまま", async () => {
    usePracticeStore.getState().setMetronomeEnabled(false);
    const { hook } = await renderFocused();

    await act(async () => {
      hook.result.current.pause();
    });
    await waitFor(() => expect(hook.result.current.status).toBe("idle"));
    expect(usePracticeStore.getState().metronomeEnabled).toBe(false);
  });

  it("メトロノームONで開始したあと一時停止しても鳴り出さない", async () => {
    usePracticeStore.getState().setMetronomeEnabled(true);
    const { hook } = await renderFocused();

    await act(async () => {
      hook.result.current.pause();
    });
    await waitFor(() => expect(hook.result.current.status).toBe("idle"));
    expect(usePracticeStore.getState().metronomeEnabled).toBe(false);
  });

  it("フォーカスが外れるとマイクを解放し、idle に戻る", async () => {
    const { hook, blur } = await renderFocused();
    expect(recorders).toHaveLength(1);

    await act(async () => {
      blur();
    });
    await waitFor(() => expect(hook.result.current.status).toBe("idle"));
    expect(recorders[0].stop).toHaveBeenCalledTimes(1);
  });
});

describe("usePitchDetector がマイクを使う条件（前面・背面、フォーカス、一時停止）", () => {
  let appStateListener: ((state: AppStateStatus) => void) | null;
  let addEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    focusEffect = null;
    recorders.length = 0;
    appStateListener = null;
    addEventListenerSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_type, listener) => {
        appStateListener = listener as (state: AppStateStatus) => void;
        return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
      });
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
  });

  async function changeAppState(state: AppStateStatus) {
    await act(async () => {
      appStateListener?.(state);
    });
  }

  it("録音中に背面へ回るとマイクを解放し、idle に戻る", async () => {
    const { hook } = await renderFocused();
    expect(recorders).toHaveLength(1);

    await changeAppState("background");
    await waitFor(() => expect(hook.result.current.status).toBe("idle"));
    expect(recorders[0].stop).toHaveBeenCalledTimes(1);
  });

  it("フォーカスが外れた後に背面から前面へ戻っても、マイクを開始しない", async () => {
    const { hook, blur } = await renderFocused();
    await act(async () => {
      blur();
    });
    await waitFor(() => expect(hook.result.current.status).toBe("idle"));

    await changeAppState("background");
    await changeAppState("active");

    expect(recorders).toHaveLength(1);
    expect(hook.result.current.status).toBe("idle");
  });

  it("一時停止中に背面から前面へ戻っても、マイクを開始せず一時停止のまま", async () => {
    const { hook } = await renderFocused();
    await act(async () => {
      hook.result.current.pause();
    });
    await waitFor(() => expect(hook.result.current.status).toBe("idle"));

    await changeAppState("background");
    await changeAppState("active");

    expect(recorders).toHaveLength(1);
    expect(hook.result.current.status).toBe("idle");
    expect(hook.result.current.pausedByUser).toBe(true);
  });

  it("一時停止中にタブを離れて戻っても、マイクを開始せず一時停止のまま", async () => {
    const { hook, blur } = await renderFocused();
    await act(async () => {
      hook.result.current.pause();
    });
    await act(async () => {
      blur();
    });
    await act(async () => {
      focusEffect?.();
    });

    expect(recorders).toHaveLength(1);
    expect(hook.result.current.status).toBe("idle");
    expect(hook.result.current.pausedByUser).toBe(true);
  });

  it("表示中で一時停止していなければ、前面へ戻ると再び listening になる", async () => {
    const { hook } = await renderFocused();
    await changeAppState("background");
    await waitFor(() => expect(hook.result.current.status).toBe("idle"));

    await changeAppState("active");
    await waitFor(() => expect(hook.result.current.status).toBe("listening"));
    expect(recorders).toHaveLength(2);
  });
});
