import { ScrollView, StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { fontSize } from "@/shared/theme";
import { PresetsTab } from "../PresetsTab";

jest.mock("@/features/practice/api/useVideoPresets", () => ({
  useVideoPresets: () => ({
    data: [
      {
        id: "preset-1",
        videoId: "abc123def45",
        title: "初心者向けコード練習 - G, C, D, Em",
        category: "chord",
      },
    ],
  }),
}));
jest.mock("@/features/practice/api/useAddRecentVideo", () => ({
  useAddRecentVideo: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/hooks/useConfirmPhraseSwitch", () => ({
  useConfirmPhraseSwitch: () => jest.fn(),
}));

describe("PresetsTab の見た目", () => {
  it("横の余白は画面枠に任せ、ScrollView 側では付けない", () => {
    render(<PresetsTab />);

    const contentStyle = StyleSheet.flatten(
      screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle,
    );
    expect(contentStyle.paddingHorizontal).toBeUndefined();
    expect(contentStyle.paddingLeft).toBeUndefined();
    expect(contentStyle.paddingRight).toBeUndefined();
    expect(contentStyle.padding).toBeUndefined();
  });

  it("セクション名はカテゴリの日本語名で、英語のバッジやラベルを出さない", () => {
    render(<PresetsTab />);

    expect(screen.getAllByText("コード").length).toBeGreaterThan(0);
    expect(screen.queryByText("PRESET")).toBeNull();
    expect(screen.queryByText("Curated routine")).toBeNull();
  });

  it("タイトルは今日タブのフレーズ名と同じ fontSize.headingLg・2行まで", () => {
    render(<PresetsTab />);

    const title = screen.getByTestId("preset-title");
    expect(StyleSheet.flatten(title.props.style).fontSize).toBe(fontSize.headingLg);
    expect(title.props.numberOfLines).toBe(2);
  });
});
