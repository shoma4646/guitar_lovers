import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { StyleSheet } from "react-native";
import { getPracticePhrases } from "@/shared/services/storage";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";
import type { PracticePhrase } from "@/shared/types/models";
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

/** カードの上下の余白（padding 12 × 2） */
const CARD_PADDING_TOTAL = 24;

function phrase(index: number, graduated = false): PracticePhrase {
  const at = new Date(2026, 10, 1 + index, 12).toISOString();
  return {
    id: `p${index}`,
    videoId: "dQw4w9WgXcQ",
    videoTitle: "video",
    name: `フレーズ${index}`,
    startSec: 0,
    endSec: 10,
    currentBpm: graduated ? 160 : 100,
    targetBpm: 160,
    playbackRate: 1,
    createdAt: at,
    updatedAt: at,
    initialBpm: 80,
    graduatedAt: graduated ? at : undefined,
  };
}

let client: QueryClient | undefined;

afterEach(() => {
  client?.clear();
  client = undefined;
});

async function renderWithPhrases(phrases: PracticePhrase[]) {
  jest.mocked(getPracticePhrases).mockResolvedValue(phrases);
  client = createTestQueryClient();
  render(
    <QueryClientProvider client={client}>
      <ProgressScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(client?.isFetching()).toBe(0));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function layout(testID: string, height: number) {
  fireEvent(screen.getByTestId(testID), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 370, height } },
  });
}

function layoutFirstRow(testID: string, height: number) {
  fireEvent(screen.getAllByTestId(testID)[0], "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 346, height } },
  });
}

describe("ProgressScreen: 一覧の行数を余った高さから決める", () => {
  const fivePhrases = [1, 2, 3, 4, 5].map((i) => phrase(i));

  it("高さを測る前は従来どおり3行＋「他2本を見る」で描く", async () => {
    await renderWithPhrases(fivePhrases);

    expect(screen.getAllByTestId("phrase-progress-row")).toHaveLength(3);
    expect(screen.getByText("他2本を見る")).toBeTruthy();
  });

  it("5行が入る高さなら5本とも表示し、「他N本を見る」を出さない", async () => {
    await renderWithPhrases(fivePhrases);

    layoutFirstRow("phrase-progress-row", 56);
    layout("phrase-list-area", 302 + CARD_PADDING_TOTAL);

    expect(screen.getAllByTestId("phrase-progress-row")).toHaveLength(5);
    expect(screen.queryByText(/本を見る$/)).toBeNull();
  });

  it("高さが足りなければ3行＋「他2本を見る」に戻る", async () => {
    await renderWithPhrases(fivePhrases);

    layoutFirstRow("phrase-progress-row", 56);
    layout("phrase-list-area", 302 + CARD_PADDING_TOTAL);
    layout("phrase-list-area", 250 + CARD_PADDING_TOTAL);

    expect(screen.getAllByTestId("phrase-progress-row")).toHaveLength(3);
    expect(screen.getByText("他2本を見る")).toBeTruthy();
  });

  it("文字拡大で行が高くなると、表示行数を減らして1画面に収める", async () => {
    await renderWithPhrases(fivePhrases);

    layout("phrase-list-area", 302 + CARD_PADDING_TOTAL);
    layoutFirstRow("phrase-progress-row", 56);
    expect(screen.getAllByTestId("phrase-progress-row")).toHaveLength(5);

    layoutFirstRow("phrase-progress-row", 76);

    expect(screen.getAllByTestId("phrase-progress-row")).toHaveLength(3);
    expect(screen.getByText("他2本を見る")).toBeTruthy();
  });
});

describe("ProgressScreen: 小さい画面では一覧の行数を減らして主ボタンを画面内に残す", () => {
  const sixPhrases = [1, 2, 3, 4, 5, 6].map((i) => phrase(i));

  it.each([
    ["iPhone SE 第2/3世代相当", 195, 2, "他4本を見る"],
    ["iPhone SE 第1世代相当", 96, 1, "他5本を見る"],
    ["従来どおり", 302, 4, "他2本を見る"],
    ["従来どおり", 330, 4, "他2本を見る"],
    ["従来どおり（中身302＋余白）", 302 + CARD_PADDING_TOTAL, 4, "他2本を見る"],
    ["従来どおり（中身330＋余白）", 330 + CARD_PADDING_TOTAL, 5, "他1本を見る"],
  ])("%s: 一覧エリアが%iptなら%i行＋「%s」", async (_, areaHeight, rows, more) => {
    await renderWithPhrases(sixPhrases);

    layoutFirstRow("phrase-progress-row", 56);
    layout("phrase-list-area", areaHeight);

    expect(screen.getAllByTestId("phrase-progress-row")).toHaveLength(rows);
    expect(screen.getByText(more)).toBeTruthy();
  });
});

describe("ProgressScreen: 行が少ないときのカードの高さ", () => {
  it.each([
    ["卒業1本", [phrase(1, true)], "11/2 卒業"],
    ["卒業0件", [phrase(1)], "卒業したフレーズはまだありません"],
  ])("%sのとき、カードは中身の高さで、余った高さは一覧の領域が受け持つ", async (_, phrases, shown) => {
    await renderWithPhrases(phrases);
    fireEvent.press(screen.getByRole("tab", { name: /卒業/ }));
    await screen.findByText(shown);

    const area = screen.getByTestId("phrase-list-area");
    expect(StyleSheet.flatten(area.props.style).flex).toBe(1);

    const cardHost = area.findAll(
      (node: typeof area) => typeof node.type === "string" && node !== area,
    )[0];
    const cardStyle = StyleSheet.flatten(cardHost.props.style);
    expect(cardStyle.padding).toBe(12);
    expect(cardStyle.flex).toBeUndefined();
    expect(cardStyle.flexGrow).toBeUndefined();
    expect(cardStyle.height).toBeUndefined();

    expect(within(area).queryByRole("button", { name: /今日の1本を開く|フレーズを追加する/ })).toBeNull();
    expect(screen.getByRole("button", { name: /今日の1本を開く|フレーズを追加する/ })).toBeTruthy();
  });
});
