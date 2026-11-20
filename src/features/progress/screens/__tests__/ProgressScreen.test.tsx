import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { Alert, Modal } from "react-native";
import { deletePracticeSession, getPracticeSessions, savePracticeSession } from "@/shared/services/storage";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";
import { ProgressScreen } from "../ProgressScreen";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("@/shared/components/molecules/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@expo/vector-icons", () => new Proxy({}, { get: () => () => null }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/shared/services/storage", () => ({
  getPracticeSessions: jest.fn(async () => []),
  getPhraseAttempts: jest.fn(async () => []),
  getPracticePhrases: jest.fn(async () => []),
  savePracticeSession: jest.fn(async () => undefined),
  deletePracticeSession: jest.fn(async () => undefined),
  StorageValidationError: class StorageValidationError extends Error {},
}));

let client: QueryClient | undefined;

afterEach(() => {
  client?.clear();
  client = undefined;
});

function renderScreen() {
  client = createTestQueryClient();
  render(
    <QueryClientProvider client={client}>
      <ProgressScreen />
    </QueryClientProvider>,
  );
}

function visibleModalCount(): number {
  return screen.UNSAFE_getAllByType(Modal).filter((modal) => modal.props.visible).length;
}

describe("ProgressScreen: 最近の記録から手動で記録を追加する", () => {
  it("最近の記録シートが閉じ終わってから入力モーダルを開き、2枚が同時に表示されない", async () => {
    renderScreen();

    fireEvent.press(await screen.findByLabelText(/^最近の記録/));
    expect(visibleModalCount()).toBe(1);

    fireEvent.press(screen.getByText("記録を手動で追加"));
    // 閉じ終わる（onDismiss）までは入力モーダルを開かない
    expect(visibleModalCount()).toBe(0);
    expect(screen.queryByText("練習を記録")).toBeNull();

    const recentSheet = screen
      .UNSAFE_getAllByType(Modal)
      .find((modal) => modal.props.onDismiss !== undefined && !modal.props.visible);
    act(() => {
      recentSheet?.props.onDismiss();
    });

    expect(visibleModalCount()).toBe(1);
    expect(screen.getByText("練習を記録")).toBeTruthy();
    expect(screen.queryByText("記録を手動で追加")).toBeNull();
  });

  it("入力モーダルを閉じた後も最近の記録シートは閉じたまま", async () => {
    renderScreen();

    fireEvent.press(await screen.findByLabelText(/^最近の記録/));
    fireEvent.press(screen.getByText("記録を手動で追加"));
    for (const modal of screen.UNSAFE_getAllByType(Modal)) {
      if (modal.props.onDismiss) act(() => modal.props.onDismiss());
    }
    fireEvent.press(screen.getAllByLabelText("閉じる").at(-1)!);

    expect(visibleModalCount()).toBe(0);
  });

  it("最近の記録シートを普通に閉じたときは入力モーダルを開かない", async () => {
    renderScreen();

    fireEvent.press(await screen.findByLabelText(/^最近の記録/));
    fireEvent.press(screen.getAllByLabelText("閉じる")[0]);
    for (const modal of screen.UNSAFE_getAllByType(Modal)) {
      if (modal.props.onDismiss) act(() => modal.props.onDismiss());
    }

    expect(visibleModalCount()).toBe(0);
  });
});

describe("ProgressScreen: 保存・削除に失敗したとき", () => {
  let alertSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, "alert");
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    alertSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  /** 処理されない失敗はJestがテストの失敗として拾うため、それが届くまで待つ */
  async function flushRejections() {
    await act(async () => {
      await new Promise((resolve) => setImmediate(resolve));
    });
  }

  it("手動追加の保存に失敗しても、処理されない失敗を出さず、案内は1回だけで、入力を残したまま開いている", async () => {
    jest.mocked(savePracticeSession).mockRejectedValueOnce(new Error("disk full"));
    renderScreen();

    fireEvent.press(await screen.findByLabelText(/^最近の記録/));
    fireEvent.press(screen.getByText("記録を手動で追加"));
    for (const modal of screen.UNSAFE_getAllByType(Modal)) {
      if (modal.props.onDismiss) act(() => modal.props.onDismiss());
    }
    fireEvent.changeText(screen.getByLabelText("練習時間入力"), "45");
    fireEvent.changeText(screen.getByLabelText("メモ入力"), "Aメロ");
    fireEvent.press(screen.getByRole("button", { name: "記録する" }));
    await flushRejections();

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith("保存に失敗しました", expect.any(String));
    expect(visibleModalCount()).toBe(1);
    expect(screen.getByLabelText("練習時間入力").props.value).toBe("45");
    expect(screen.getByLabelText("メモ入力").props.value).toBe("Aメロ");
  });

  it("記録の削除に失敗しても、処理されない失敗を出さない", async () => {
    jest.mocked(getPracticeSessions).mockResolvedValueOnce([
      { id: "s1", date: new Date().toISOString(), duration: 600 },
    ]);
    jest.mocked(deletePracticeSession).mockRejectedValueOnce(new Error("disk full"));
    renderScreen();

    fireEvent.press(await screen.findByLabelText("最近の記録 1件"));
    fireEvent(screen.getByLabelText(/練習10分/), "longPress");
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    act(() => buttons.find((button) => button.text === "削除")?.onPress?.());
    await flushRejections();

    expect(alertSpy).toHaveBeenLastCalledWith("保存に失敗しました", expect.any(String));
  });
});

describe("ProgressScreen: 見出し", () => {
  it("画面タイトルは読み上げで見出しとして扱われる", async () => {
    renderScreen();

    expect(await screen.findByRole("header", { name: "進捗" })).toBeTruthy();
  });
});
