import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";
import { getPhraseAttempts, getPracticePhrases, getPracticeSessions } from "@/shared/services/storage";
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
  getPracticeSessions: jest.fn(),
  getPhraseAttempts: jest.fn(),
  getPracticePhrases: jest.fn(),
  savePracticeSession: jest.fn(async () => undefined),
  deletePracticeSession: jest.fn(async () => undefined),
}));

const readFailure = () => Promise.reject(new Error("Couldn't read row 0, col 0 from CursorWindow"));
const getters = [getPracticeSessions, getPhraseAttempts, getPracticePhrases] as jest.Mock[];

let client: QueryClient | undefined;

beforeEach(() => {
  for (const getter of getters) getter.mockReset().mockImplementation(async () => []);
});

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

describe("ProgressScreen: 端末内の記録を読み出せないとき", () => {
  it.each([
    ["練習セッション", getPracticeSessions],
    ["練習結果", getPhraseAttempts],
    ["フレーズ", getPracticePhrases],
  ])("%sの読み出しに失敗すると、0件の空状態ではなくエラーと再読み込みを出す", async (_name, getter) => {
    (getter as jest.Mock).mockImplementation(readFailure);

    renderScreen();

    expect(await screen.findByText(/読み込めませんでした/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.queryByText(/Practiceタブでフレーズを保存すると/)).toBeNull();
    expect(screen.queryByText("フレーズを追加する")).toBeNull();
    expect(screen.queryByLabelText(/^最近の記録/)).toBeNull();
  });

  it("再読み込みを押すと読み出しをやり直し、成功すれば通常の表示に戻る", async () => {
    (getPracticeSessions as jest.Mock).mockImplementation(readFailure);
    renderScreen();
    const retry = await screen.findByRole("button", { name: "再読み込み" });
    const callsBefore = (getPracticeSessions as jest.Mock).mock.calls.length;
    (getPracticeSessions as jest.Mock).mockImplementation(async () => []);

    fireEvent.press(retry);

    await waitFor(() => expect(screen.queryByText(/読み込めませんでした/)).toBeNull());
    expect((getPracticeSessions as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
    expect(screen.getByLabelText(/^最近の記録/)).toBeTruthy();
  });
});
