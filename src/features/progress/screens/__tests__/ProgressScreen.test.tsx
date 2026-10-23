import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Modal } from "react-native";
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
}));

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
