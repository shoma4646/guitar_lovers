import type { ReactNode } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { PitchDetectorState } from "@/features/tuner/hooks/usePitchDetector";
import { SCHEMA_VERSION, STORAGE_KEYS, saveTunerSettings } from "@/shared/services/storage";
import { tunerQueryKeys } from "@/features/tuner/api/useTunerSettings";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";
import { TunerScreen } from "../TunerScreen";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@/shared/services/storage", () => {
  const actual = jest.requireActual("@/shared/services/storage");
  return { ...actual, saveTunerSettings: jest.fn(actual.saveTunerSettings) };
});
jest.mock("@/shared/components/molecules/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children: ReactNode }) => children,
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock("@/shared/hooks/useKeepAwakeWhileFocused", () => ({
  useKeepAwakeWhileFocused: () => {},
}));

let mockDetector: PitchDetectorState;
jest.mock("@/features/tuner/hooks/usePitchDetector", () => ({
  usePitchDetector: () => mockDetector,
}));

const mockedSave = saveTunerSettings as jest.Mock;

function listening(hz: number | null): PitchDetectorState {
  return {
    status: "listening",
    hz,
    inputLevelDb: -30,
    pausedByUser: false,
    pause: jest.fn(),
    resume: jest.fn(),
  };
}

/** アプリの起動1回分。キャッシュを持ち越さないよう毎回新しいQueryClientで描画する */
function launchTuner() {
  const client = createTestQueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <TunerScreen />
    </QueryClientProvider>,
  );
  return { client, unmount: view.unmount };
}

const PRESET_LABELS = ["スタンダード", "半音下げ", "ドロップD"] as const;

function checkedPresetLabel(): string | undefined {
  return PRESET_LABELS.find(
    (label) => screen.getByRole("radio", { name: label }).props.accessibilityState?.checked === true,
  );
}

/** 設定の読み込み（成功・失敗とも）が終わるまで待つ */
async function waitForSettingsLoaded(client: QueryClient) {
  await waitFor(() =>
    expect(client.getQueryState(tunerQueryKeys.settings)?.status).not.toBe("pending"),
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, String(SCHEMA_VERSION));
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockDetector = listening(null);
});

afterEach(() => {
  (Alert.alert as jest.Mock).mockRestore();
  (console.error as jest.Mock).mockRestore();
});

describe("TunerScreen のチューニングプリセットを次回の起動へ持ち越す", () => {
  it("「半音下げ」を選んで画面を開き直すと「半音下げ」が選ばれている", async () => {
    const first = launchTuner();
    await waitForSettingsLoaded(first.client);
    fireEvent.press(screen.getByText("半音下げ"));
    await waitFor(() => expect(mockedSave).toHaveBeenCalled());
    await act(async () => {});
    first.unmount();

    launchTuner();

    await waitFor(() => expect(checkedPresetLabel()).toBe("半音下げ"));
  });

  it("プリセットを切り替えると保存処理は1回だけ呼ばれる", async () => {
    const { client } = launchTuner();
    await waitForSettingsLoaded(client);

    fireEvent.press(screen.getByText("ドロップD"));
    await act(async () => {});

    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ preset: "dropD" });
  });

  it("選択中のプリセットを押し直しても保存しない", async () => {
    const { client } = launchTuner();
    await waitForSettingsLoaded(client);

    fireEvent.press(screen.getByText("スタンダード"));
    await act(async () => {});

    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("保存に失敗しても画面の選択は戻さず、保存できなかったことを知らせる", async () => {
    mockedSave.mockRejectedValueOnce(new Error("disk full"));
    const { client } = launchTuner();
    await waitForSettingsLoaded(client);

    fireEvent.press(screen.getByText("半音下げ"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1));

    expect(checkedPresetLabel()).toBe("半音下げ");
  });
});

describe("TunerScreen の保存値が使えないときはスタンダードで始める", () => {
  it("保存値が無いとき", async () => {
    launchTuner();

    await waitFor(() => expect(checkedPresetLabel()).toBe("スタンダード"));
  });

  it.each([
    ["存在しないプリセット名", JSON.stringify({ preset: "openG" })],
    ["JSONとして壊れている", "{preset:"],
  ])("保存値が不正なとき（%s）", async (_case, raw) => {
    await AsyncStorage.setItem(STORAGE_KEYS.TUNER_SETTINGS, raw);

    const { client } = launchTuner();

    await waitForSettingsLoaded(client);
    expect(checkedPresetLabel()).toBe("スタンダード");
  });

  it("読み出し自体が失敗したとき", async () => {
    // モックのgetItem自体がjest.fnのため、spyOnのmockRestoreでは元の実装に戻らない
    const getItem = AsyncStorage.getItem as jest.Mock;
    const originalImpl = getItem.getMockImplementation()!;
    getItem.mockImplementation(async (key: string) => {
      if (key === STORAGE_KEYS.TUNER_SETTINGS) throw new Error("read failed");
      return originalImpl(key);
    });

    try {
      const { client } = launchTuner();

      await waitForSettingsLoaded(client);
      expect(client.getQueryState(tunerQueryKeys.settings)?.status).toBe("error");
      expect(checkedPresetLabel()).toBe("スタンダード");
    } finally {
      getItem.mockImplementation(originalImpl);
    }
  });
});

describe("TunerScreen は保存したプリセットを読み終えるまで判定を出さない", () => {
  it("半音下げを保存済みでEb2を鳴らしても、読み込み前に「締める」と出さず、読み込み後は合っていると出す", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.TUNER_SETTINGS, JSON.stringify({ preset: "halfStepDown" }));
    mockDetector = listening(77.78);

    launchTuner();

    expect(screen.queryByText(/締め/)).toBeNull();
    expect(screen.getByTestId("tuner-note").props.accessibilityLabel).toBe("音を検出していません");

    await waitFor(() => expect(checkedPresetLabel()).toBe("半音下げ"));
    expect(screen.getByTestId("tuner-note").props.children).toBe("Eb2");
    expect(screen.queryByText(/締め/)).toBeNull();
  });
});

describe("TunerScreen はオフライン扱いでも保存したプリセットを読む", () => {
  it("オフラインのときも読み込みが止まらず、保存した「ドロップD」で始まる", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.TUNER_SETTINGS, JSON.stringify({ preset: "dropD" }));
    onlineManager.setOnline(false);

    try {
      launchTuner();

      await waitFor(() => expect(checkedPresetLabel()).toBe("ドロップD"));
    } finally {
      onlineManager.setOnline(true);
    }
  });
});
