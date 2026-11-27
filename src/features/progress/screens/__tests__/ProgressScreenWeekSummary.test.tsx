import { render, screen } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { getPracticeSessions } from "@/shared/services/storage";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";
import { localDayToDate, toLocalDay } from "@/shared/lib/localDay";
import { ProgressScreen } from "../ProgressScreen";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("@/shared/components/molecules/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@expo/vector-icons/MaterialIcons", () => () => null);
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/shared/services/storage", () => ({
  getPracticeSessions: jest.fn(async () => []),
  getPhraseAttempts: jest.fn(async () => []),
  getPracticePhrases: jest.fn(async () => []),
  savePracticeSession: jest.fn(async () => undefined),
  deletePracticeSession: jest.fn(async () => undefined),
  StorageValidationError: class StorageValidationError extends Error {},
}));

const WEEK_DAYS_LONG = ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"];

// 端末時計と異なる曜日を基準日にし、週バーの「今日」が集計と同じ基準日から来ることを確かめる
const realNow = new Date();
const mockBaseDay = toLocalDay(
  new Date(realNow.getFullYear(), realNow.getMonth(), realNow.getDate() - 3, 12),
);
jest.mock("@/shared/hooks/useLocalDay", () => ({ useLocalDay: () => mockBaseDay }));

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

describe("ProgressScreen: 今週の練習日数と週バー", () => {
  it("今週の練習日数は1要素で「今週の練習日数 N日」として読まれる", async () => {
    const base = localDayToDate(mockBaseDay);
    jest.mocked(getPracticeSessions).mockResolvedValueOnce([
      { id: "s1", date: base.toISOString(), duration: 600 },
    ]);
    renderScreen();

    const summary = await screen.findByLabelText("今週の練習日数 1日（7日中）");
    expect(summary.props.accessible).toBe(true);
  });

  it("週バーの「今日」は集計と同じ基準日の曜日になる", async () => {
    renderScreen();
    const todayIdx = (localDayToDate(mockBaseDay).getDay() + 6) % 7;

    const chart = await screen.findByRole("image");
    expect(chart.props.accessibilityLabel).toContain(`${WEEK_DAYS_LONG[todayIdx]}（今日）`);
  });
});
