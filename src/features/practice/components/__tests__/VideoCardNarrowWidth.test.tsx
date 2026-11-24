import { Image, StyleSheet } from "react-native";
import { render, screen, within } from "@testing-library/react-native";
import { FavoritesTab } from "../FavoritesTab";
import { PresetsTab } from "../PresetsTab";

const mockWindow = { width: 375, height: 812, scale: 3, fontScale: 1 };
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => mockWindow,
}));
jest.mock("@/features/practice/api/useVideoPresets", () => ({
  useVideoPresets: () => ({
    data: [
      {
        id: "preset-1",
        videoId: "abc123def45",
        title: "初心者向けコード練習 - G, C, D chord",
        category: "chord",
      },
    ],
  }),
}));
jest.mock("@/features/practice/api/useRecentVideos", () => ({
  useRecentVideos: () => ({
    data: [{ videoId: "rrrrrrrrrr1", title: "最近の動画", lastWatchedAt: "2026-10-26T12:00:00.000Z" }],
  }),
}));
jest.mock("@/features/practice/api/useFavoriteVideos", () => ({
  useFavoriteVideos: () => ({
    data: [{ id: "f1", videoId: "ffffffffff1", title: "お気に入りの動画", addedAt: "2026-10-26T12:00:00.000Z" }],
  }),
}));
jest.mock("@/features/practice/api/useToggleFavoriteVideo", () => ({
  useToggleFavoriteVideo: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/hooks/useConfirmPhraseSwitch", () => ({
  useConfirmPhraseSwitch: () => jest.fn(),
}));

type CardMetrics = { padding: unknown; gap: unknown; thumb: unknown; fontSize: unknown; lineHeight: unknown };

/** 動画名から、そのカードの余白・間隔・サムネの幅・タイトルの文字サイズを読み取る */
function cardMetrics(title: string): CardMetrics {
  const card = screen.getByRole("button", { name: new RegExp(`^${title}を再生`) });
  const cardStyle = StyleSheet.flatten(card.props.style);
  const thumbStyle = StyleSheet.flatten(within(card).UNSAFE_getByType(Image).props.style);
  const titleStyle = StyleSheet.flatten(within(card).getByText(title).props.style);
  return {
    padding: cardStyle.padding,
    gap: cardStyle.gap,
    thumb: thumbStyle.width,
    fontSize: titleStyle.fontSize,
    lineHeight: titleStyle.lineHeight,
  };
}

const NARROW: CardMetrics = { padding: 12, gap: 12, thumb: 64, fontSize: 16, lineHeight: 20 };
const REGULAR: CardMetrics = { padding: 16, gap: 16, thumb: 80, fontSize: 18, lineHeight: 22 };

describe.each([
  ["メニュー集", () => render(<PresetsTab />), ["初心者向けコード練習 - G, C, D chord"]],
  ["お気に入り", () => render(<FavoritesTab />), ["最近の動画", "お気に入りの動画"]],
] as const)("%sの動画カードの寸法", (_tab, renderTab, titles) => {
  it.each(titles)("幅320では「%s」のタイトル欄を広げるため、サムネ・余白・文字を小さくする", (title) => {
    mockWindow.width = 320;
    renderTab();

    expect(cardMetrics(title)).toEqual(NARROW);
  });

  it.each([360, 375, 390])("幅%iでは今までどおりの寸法", (width) => {
    mockWindow.width = width;
    renderTab();

    for (const title of titles) {
      expect(cardMetrics(title)).toEqual(REGULAR);
    }
  });
});
