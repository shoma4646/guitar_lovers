import { Profiler } from "react";
import { act, render, screen } from "@testing-library/react-native";
import { TunerScreen } from "../TunerScreen";

jest.mock("@/shared/components/molecules/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/shared/hooks/useKeepAwakeWhileFocused", () => ({
  useKeepAwakeWhileFocused: () => {},
}));

let mockFocusEffect: (() => void | (() => void)) | null = null;
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (effect: () => void | (() => void)) => {
    mockFocusEffect = effect;
  },
}));

const mockDetectedHz: number[] = [];
jest.mock("pitchy", () => ({
  PitchDetector: {
    forFloat32Array: () => ({
      minVolumeAbsolute: 0,
      findPitch: () => [mockDetectedHz.shift() ?? 0, 0.99],
    }),
  },
}));

type AudioReadyEvent = { buffer: { sampleRate: number; getChannelData: () => Float32Array } };
let mockOnAudioReady: ((event: AudioReadyEvent) => void) | null = null;
jest.mock("react-native-audio-api", () => ({
  AudioManager: {
    requestRecordingPermissions: async () => "Granted",
    setAudioSessionOptions: () => {},
  },
  AudioRecorder: jest.fn().mockImplementation(() => ({
    onError: () => {},
    onAudioReady: (_options: unknown, callback: (event: AudioReadyEvent) => void) => {
      mockOnAudioReady = callback;
    },
    clearOnAudioReady: () => {},
    clearOnError: () => {},
    isRecording: () => false,
    start: async () => ({ status: "success" }),
    stop: async () => {},
  })),
}));

/** 4096サンプル / 44.1kHz で届く1フレームの間隔 */
const FRAME_MS = 93;
const FRAME_COUNT = 10;
const PCM = new Float32Array(4096).fill(0.1);

function pushFrame() {
  act(() => {
    jest.advanceTimersByTime(FRAME_MS);
    mockOnAudioReady?.({ buffer: { sampleRate: 44100, getChannelData: () => PCM } });
  });
}

describe("TunerScreen の検出中の描画回数", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFocusEffect = null;
    mockOnAudioReady = null;
    mockDetectedHz.length = 0;
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("検出値が毎フレーム変わっても、10フレームでの画面のコミットは10回以下", async () => {
    const onRender = jest.fn();
    render(
      <Profiler id="tuner" onRender={onRender}>
        <TunerScreen />
      </Profiler>,
    );
    await act(async () => {
      mockFocusEffect?.();
    });
    expect(screen.getByText("マイク入力中")).toBeTruthy();
    expect(mockOnAudioReady).not.toBeNull();

    // 5弦（110Hz）から外れた音を、表示桁（小数1桁）が毎回変わるように流す
    mockDetectedHz.push(...Array.from({ length: FRAME_COUNT }, (_, i) => 112 + i * 0.1));
    onRender.mockClear();
    for (let i = 0; i < FRAME_COUNT; i++) {
      pushFrame();
    }

    expect(screen.getByText("5弦 ・ +42 cents")).toBeTruthy();
    expect(onRender.mock.calls.length).toBeLessThanOrEqual(FRAME_COUNT);
  });

  it("表示桁が変わらない検出値が続く間は描き直さない", async () => {
    const onRender = jest.fn();
    render(
      <Profiler id="tuner" onRender={onRender}>
        <TunerScreen />
      </Profiler>,
    );
    await act(async () => {
      mockFocusEffect?.();
    });

    mockDetectedHz.push(...Array.from({ length: FRAME_COUNT }, (_, i) => 112.01 + (i % 2) * 0.02));
    pushFrame();
    onRender.mockClear();
    for (let i = 1; i < FRAME_COUNT; i++) {
      pushFrame();
    }

    expect(screen.getByText("112.0 Hz")).toBeTruthy();
    expect(onRender).not.toHaveBeenCalled();
  });

  it("表示桁が変わらない合った音が続けば、検出値の更新が無くても0.5秒後にチューニング済みにする", async () => {
    render(<TunerScreen />);
    await act(async () => {
      mockFocusEffect?.();
    });

    mockDetectedHz.push(110, 110, 110);
    pushFrame();
    expect(screen.getByLabelText("5弦 A2 未チューニング")).toBeTruthy();

    pushFrame();
    pushFrame();
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByLabelText("5弦 A2 チューニング完了")).toBeTruthy();
  });
});
