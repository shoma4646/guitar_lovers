import { act, renderHook, waitFor } from "@testing-library/react-native";
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
