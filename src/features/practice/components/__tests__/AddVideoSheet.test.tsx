import { render, screen } from "@testing-library/react-native";
import { usePracticeStore } from "@/stores/practice";
import { describePlayerError } from "@/features/practice/lib/playerError";
import { AddVideoSheet } from "../AddVideoSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/features/practice/api/useAddRecentVideo", () => ({
  useAddRecentVideo: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/useRecentVideos", () => ({
  useRecentVideos: () => ({ data: [] }),
}));

const initialState = usePracticeStore.getState();

describe("AddVideoSheet の動画エラー表示", () => {
  beforeEach(() => {
    usePracticeStore.setState(initialState, true);
  });

  it.each([
    [-1, "動画を読み込めませんでした"],
    [100, "この動画は再生できません"],
    [150, "この動画はアプリ内で再生できません"],
  ])("playerError=%i で開くと、コード別の見出しとdescribePlayerErrorの文言を出す", (code, title) => {
    usePracticeStore.getState().setPlayerError(code);

    render(<AddVideoSheet visible onClose={jest.fn()} />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(describePlayerError(code))).toBeTruthy();
  });

  it("エラーが無ければ案内を出さない", () => {
    render(<AddVideoSheet visible onClose={jest.fn()} />);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
