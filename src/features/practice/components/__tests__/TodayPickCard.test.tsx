import { fireEvent, render, screen } from "@testing-library/react-native";
import { TodayPickCard } from "../TodayPickCard";

jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: [], isLoading: false }),
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: [], isLoading: false }),
}));

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
