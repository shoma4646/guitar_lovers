import { Image, ScrollView, StyleSheet, Text } from "react-native";
import { render, screen, within } from "@testing-library/react-native";
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
      {
        id: "preset-2",
        videoId: "zyx987wvu65",
        title: "コードチェンジ練習",
        category: "chord",
      },
    ],
  }),
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

  it("タイトルはお気に入りのカードと同じ18ptの太字・2行まで", () => {
    render(<PresetsTab />);

    for (const title of screen.getAllByTestId("preset-title")) {
      expect(StyleSheet.flatten(title.props.style)).toMatchObject({ fontSize: 18, fontWeight: "700" });
      expect(title.props.numberOfLines).toBe(2);
    }
  });

  it("カード内にはカテゴリ名を出さない（見出しの1回だけ）", () => {
    render(<PresetsTab />);

    const cards = screen.getAllByRole("button", { name: /を再生$/ });
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      const texts = card.findAll((node: typeof card) => node.type === Text);
      expect(texts.map((node: typeof card) => node.props.children)).not.toContain("コード");
    }
    expect(screen.getAllByText("コード")).toHaveLength(1);
  });

  it("各カードに動画のサムネ（YouTube mqdefault）を出す", () => {
    render(<PresetsTab />);

    const [first, second] = screen.getAllByRole("button", { name: /を再生$/ });
    expect(within(first).UNSAFE_getByType(Image).props.source).toEqual({
      uri: "https://img.youtube.com/vi/abc123def45/mqdefault.jpg",
    });
    expect(within(second).UNSAFE_getByType(Image).props.source).toEqual({
      uri: "https://img.youtube.com/vi/zyx987wvu65/mqdefault.jpg",
    });
  });
});

describe("PresetsTab の見出し", () => {
  it("カテゴリ名は見出しとして読まれ、カードは見出しにしない", () => {
    render(<PresetsTab />);

    expect(screen.getAllByRole("header").map((h) => h.props.children)).toEqual(["コード"]);
  });
});
