import { ScrollView, Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { ScreenFrame } from "../ScreenFrame";

const mockWindow = { width: 393, height: 852, scale: 3, fontScale: 1 };
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => mockWindow,
}));
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
  };
});

function renderFrame(props: { scrollWhenOverflow?: boolean } = {}) {
  render(
    <ScreenFrame {...props}>
      <Text>中身</Text>
    </ScreenFrame>,
  );
}

describe("ScreenFrame のスクロール切り替え", () => {
  beforeEach(() => {
    mockWindow.height = 852;
    mockWindow.fontScale = 1;
  });

  it("高さ852・文字サイズ標準なら1画面に収め、ScrollViewを描画しない", () => {
    renderFrame();
    expect(screen.UNSAFE_queryByType(ScrollView)).toBeNull();
  });

  it("高さ852でも文字サイズ1.35倍ならScrollViewへ切り替える", () => {
    mockWindow.fontScale = 1.35;
    renderFrame();
    expect(screen.UNSAFE_queryByType(ScrollView)).not.toBeNull();
  });

  it("文字サイズ1.15倍までは1画面のまま", () => {
    mockWindow.fontScale = 1.15;
    renderFrame();
    expect(screen.UNSAFE_queryByType(ScrollView)).toBeNull();
  });

  it("高さが足りない端末では文字サイズ標準でもScrollViewへ切り替える", () => {
    mockWindow.height = 667;
    renderFrame();
    expect(screen.UNSAFE_queryByType(ScrollView)).not.toBeNull();
  });

  it("scrollWhenOverflow=false なら収まらなくても画面全体はスクロールさせない（子がスクロール領域を持つ）", () => {
    mockWindow.fontScale = 1.35;
    renderFrame({ scrollWhenOverflow: false });
    expect(screen.UNSAFE_queryByType(ScrollView)).toBeNull();
  });
});
