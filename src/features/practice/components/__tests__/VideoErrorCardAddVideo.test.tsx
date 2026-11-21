import { useState } from "react";
import { AccessibilityInfo } from "react-native";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { usePracticeStore } from "@/stores/practice";
import { describePlayerError } from "@/features/practice/lib/playerError";
import { AddVideoSheet } from "../AddVideoSheet";
import { VideoErrorCard } from "../VideoErrorCard";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/features/practice/api/useRecentVideos", () => ({
  useRecentVideos: () => ({ data: [] }),
}));
jest.mock("@/features/practice/api/useArchivePracticePhrase", () => ({
  useArchivePracticePhrase: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/useDeletePracticePhrase", () => ({
  useDeletePracticePhrase: () => ({ mutate: jest.fn() }),
}));
jest.mock("expo-clipboard", () => ({
  isPasteButtonAvailable: false,
  getStringAsync: () => Promise.resolve(""),
}));

function ErrorCardWithAddVideoSheet({ code }: { code: number }) {
  const [addVideoVisible, setAddVideoVisible] = useState(false);
  return (
    <>
      <VideoErrorCard code={code} onOpenAddVideo={() => setAddVideoVisible(true)} />
      <AddVideoSheet visible={addVideoVisible} onClose={() => setAddVideoVisible(false)} />
    </>
  );
}

const initialState = usePracticeStore.getState();

describe("動画エラー画面から動画の入力シートを開く", () => {
  beforeEach(() => {
    usePracticeStore.setState(initialState, true);
    jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("「別の動画を読み込む」で開いたシートの先頭に直前の再生エラーが出る", () => {
    usePracticeStore.getState().loadVideo("abc123def45", "動画");
    usePracticeStore.getState().setPlayerError(100);
    render(<ErrorCardWithAddVideoSheet code={100} />);
    expect(screen.queryByTestId("bottom-sheet")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "別の動画を読み込む" }));

    const sheet = within(screen.getByTestId("bottom-sheet"));
    expect(sheet.getByRole("alert")).toBeTruthy();
    expect(sheet.getByText("この動画は再生できません")).toBeTruthy();
    expect(sheet.getByText(describePlayerError(100))).toBeTruthy();
  });
});
