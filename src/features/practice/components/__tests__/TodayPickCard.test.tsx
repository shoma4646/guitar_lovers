import { fireEvent, render, screen } from "@testing-library/react-native";
import { TodayPickCard } from "../TodayPickCard";

type QueryStub = { data: unknown[] | undefined; isLoading: boolean; refetch: jest.Mock };

const mockPhrasesQuery: QueryStub = { data: [], isLoading: false, refetch: jest.fn() };
const mockAttemptsQuery: QueryStub = { data: [], isLoading: false, refetch: jest.fn() };

jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => mockPhrasesQuery,
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => mockAttemptsQuery,
}));

beforeEach(() => {
  mockPhrasesQuery.data = [];
  mockAttemptsQuery.data = [];
  mockPhrasesQuery.refetch.mockClear();
  mockAttemptsQuery.refetch.mockClear();
});

describe("TodayPickCard（フレーズ0本の空状態）", () => {
  it("主ボタン「YouTubeの動画を追加」と副ボタン「サンプル動画で試す」を出し、主ボタンで動画追加を開く", () => {
    const onOpenAddVideo = jest.fn();
    const onTryPreset = jest.fn();
    render(
      <TodayPickCard
        onStartPhrase={jest.fn()}
        onTryPreset={onTryPreset}
        onOpenAddVideo={onOpenAddVideo}
      />,
    );

    const addVideo = screen.getByRole("button", { name: "YouTubeの動画を追加" });
    const tryPreset = screen.getByRole("button", { name: "サンプル動画で試す" });

    fireEvent.press(addVideo);
    expect(onOpenAddVideo).toHaveBeenCalledTimes(1);
    expect(onTryPreset).not.toHaveBeenCalled();

    fireEvent.press(tryPreset);
    expect(onTryPreset).toHaveBeenCalledTimes(1);
  });

  it("動画追加からフレーズ保存までの3ステップを案内する", () => {
    render(<TodayPickCard onStartPhrase={jest.fn()} onTryPreset={jest.fn()} onOpenAddVideo={jest.fn()} />);
    expect(screen.getByText("YouTubeのURLを貼る")).toBeTruthy();
    expect(screen.getByText("A・Bで区間を囲んで保存")).toBeTruthy();
    expect(screen.getByText("翌日からワンタップで練習")).toBeTruthy();
  });
});

describe("TodayPickCard（記録の読み出し失敗）", () => {
  it.each([
    ["フレーズ", mockPhrasesQuery],
    ["練習結果", mockAttemptsQuery],
  ])("%sを読み込めないときは、0本の空状態ではなく読み込み失敗と再読み込みボタンを出す", (_name, failed) => {
    failed.data = undefined;
    render(<TodayPickCard onStartPhrase={jest.fn()} onTryPreset={jest.fn()} onOpenAddVideo={jest.fn()} />);

    expect(screen.getByText("練習の記録を読み込めませんでした")).toBeTruthy();
    expect(screen.queryByText("練習したいフレーズを登録しよう")).toBeNull();
    expect(screen.queryByRole("button", { name: "YouTubeの動画を追加" })).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "再読み込み" }));
    expect(mockPhrasesQuery.refetch).toHaveBeenCalledTimes(1);
    expect(mockAttemptsQuery.refetch).toHaveBeenCalledTimes(1);
  });
});
