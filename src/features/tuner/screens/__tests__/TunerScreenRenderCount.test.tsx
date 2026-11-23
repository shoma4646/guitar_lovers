import { Profiler } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { TunerScreen } from "../TunerScreen";

jest.mock("@/shared/components/molecules/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/shared/hooks/useKeepAwakeWhileFocused", () => ({
  useKeepAwakeWhileFocused: () => {},
}));
jest.mock("@/features/tuner/api/useTunerSettings", () => {
  const loaded = { data: { preset: "standard" }, isPending: false };
  return { useTunerSettings: () => loaded };
});
jest.mock("@/features/tuner/api/useSaveTunerSettings", () => {
  const save = { mutate: jest.fn() };
  return { useSaveTunerSettings: () => save };
});

const mockFocusEffects = new Set<() => void | (() => void)>();
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useRouter: () => ({ push: jest.fn() }),
    // 画面内のすべてのuseFocusEffectを集め、focus() でまとめて発火する
    useFocusEffect: (effect: () => void | (() => void)) => {
      useEffect(() => {
        mockFocusEffects.add(effect);
        return () => {
          mockFocusEffects.delete(effect);
        };
      }, [effect]);
    },
  };
});

function focus() {
  for (const effect of mockFocusEffects) effect();
}

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
    mockFocusEffects.clear();
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
      focus();
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

  it("画面に出る周波数（小数1桁）とセント差が変わらない検出値が続く間は描き直さない", async () => {
    const onRender = jest.fn();
    render(
      <Profiler id="tuner" onRender={onRender}>
        <TunerScreen />
      </Profiler>,
    );
    await act(async () => {
      focus();
    });

    mockDetectedHz.push(...Array.from({ length: FRAME_COUNT }, (_, i) => 112.0 + (i % 2) * 0.01));
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
      focus();
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

describe("TunerScreen の判定は表示桁の中で動いた最新の検出値で行う", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFocusEffects.clear();
    mockOnAudioReady = null;
    mockDetectedHz.length = 0;
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  function holdDetectedHz(hz: number, frames: number) {
    mockDetectedHz.push(...Array(frames).fill(hz));
    for (let i = 0; i < frames; i++) {
      pushFrame();
    }
  }

  async function startTuner(presetLabel: string) {
    render(<TunerScreen />);
    fireEvent.press(screen.getByText(presetLabel));
    await act(async () => {
      focus();
    });
  }

  it("ドロップDの6弦で下端から入り 73.24Hz（-4.2 cent）で止めると、合っていると判定する", async () => {
    await startTuner("ドロップD");

    holdDetectedHz(73.15, 5);
    expect(screen.getByText("6弦 ・ -6 cents")).toBeTruthy();

    holdDetectedHz(73.24, 5);
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText("6弦 ・ -4 cents")).toBeTruthy();
    expect(screen.getByText("6弦: 合っています")).toBeTruthy();
    expect(screen.getByLabelText("6弦 D2 チューニング完了")).toBeTruthy();
  });

  it("半音下げの6弦で 77.96Hz（+4.0 cent）から 78.04Hz（+5.7 cent）へずれると、合っていないと判定する", async () => {
    await startTuner("半音下げ");

    // 合った音が0.5秒続く前に、平滑化の中央値が 78.04Hz へ入れ替わるフレーム数にする
    holdDetectedHz(77.96, 3);
    expect(screen.getByText("6弦: 合っています")).toBeTruthy();

    holdDetectedHz(78.04, 5);
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText("6弦 ・ +6 cents")).toBeTruthy();
    expect(screen.getByText("6弦: 高い・少し緩める")).toBeTruthy();
    expect(screen.getByLabelText("6弦 Eb2 未チューニング")).toBeTruthy();
  });
});
