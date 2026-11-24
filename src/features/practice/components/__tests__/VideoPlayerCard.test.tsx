import { createRef } from "react";
import { StyleSheet } from "react-native";
import { act, render, screen } from "@testing-library/react-native";
import type WebView from "react-native-webview";
import { YOUTUBE_EMBED_ORIGIN } from "@/features/practice/lib/youtubeHtml";
import { VideoPlayerCard } from "../VideoPlayerCard";

type MockWebViewProps = {
  allowsLinkPreview?: boolean;
  onLoadStart?: (event: { nativeEvent: { url: string } }) => void;
};
const mockWebView: { props: MockWebViewProps | null; stopLoading: jest.Mock } = {
  props: null,
  stopLoading: jest.fn(),
};
jest.mock("react-native-webview", () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual<typeof import("react")>("react");
  return {
    __esModule: true,
    default: forwardRef(function MockWebView(props: MockWebViewProps, ref) {
      mockWebView.props = props;
      useImperativeHandle(ref, () => ({ stopLoading: mockWebView.stopLoading }));
      return null;
    }),
  };
});

const mockWindow = { width: 393, height: 852, scale: 3, fontScale: 1 };
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => mockWindow,
}));

function renderCard() {
  const onUnexpectedNavigation = jest.fn();
  const ref = createRef<WebView>();
  render(
    <VideoPlayerCard
      ref={ref}
      videoId="abc123def45"
      onTimeUpdate={jest.fn()}
      onDurationReady={jest.fn()}
      onPlayerError={jest.fn()}
      onUnexpectedNavigation={onUnexpectedNavigation}
    />,
  );
  return { onUnexpectedNavigation, ref };
}

function loadStart(url: string) {
  if (!mockWebView.props?.onLoadStart) throw new Error("WebViewにonLoadStartが渡されていない");
  const { onLoadStart } = mockWebView.props;
  act(() => onLoadStart({ nativeEvent: { url } }));
}

beforeEach(() => {
  mockWindow.width = 393;
  mockWebView.props = null;
  mockWebView.stopLoading.mockClear();
});

describe("VideoPlayerCard の長押しの守り", () => {
  it("リンクの長押しでOS標準のプレビューを出さない（許可リストを通らずに読み込まれるため）", () => {
    renderCard();

    expect(mockWebView.props?.allowsLinkPreview).toBe(false);
  });
});

describe("VideoPlayerCard の大きさ", () => {
  function frameSize(): { width: unknown; height: unknown } {
    const { width, height } = StyleSheet.flatten(screen.getByTestId("video-player-frame").props.style);
    return { width, height };
  }

  it("幅320の端末でも、YouTube 埋め込みプレイヤーの最小サイズ（200×200）を下回らない", () => {
    mockWindow.width = 320;
    renderCard();

    const { width, height } = frameSize();
    expect(width).toBe(320);
    expect(height).toBeGreaterThanOrEqual(200);
  });

  it.each([
    [375, 211],
    [390, 219],
  ])("幅%iでは今までどおり16:9の高さ%iになる", (screenWidth, expectedHeight) => {
    mockWindow.width = screenWidth;
    renderCard();

    expect(frameSize()).toEqual({ width: screenWidth, height: expectedHeight });
  });
});

describe("VideoPlayerCard の事後の遷移の守り", () => {
  it("プレイヤー枠でyoutube.comの読み込みが始まったら、読み込みを止めてプレイヤーの作り直しを求める", () => {
    const { onUnexpectedNavigation } = renderCard();

    loadStart("https://www.youtube.com/watch?v=x");

    expect(mockWebView.stopLoading).toHaveBeenCalledTimes(1);
    expect(onUnexpectedNavigation).toHaveBeenCalledTimes(1);
  });

  it.each(["about:blank", YOUTUBE_EMBED_ORIGIN, `${YOUTUBE_EMBED_ORIGIN}/`])(
    "プレイヤーHTMLの読み込み（%s）では何もしない",
    (url) => {
      const { onUnexpectedNavigation } = renderCard();

      loadStart(url);

      expect(mockWebView.stopLoading).not.toHaveBeenCalled();
      expect(onUnexpectedNavigation).not.toHaveBeenCalled();
    },
  );

  it("呼び出し側から渡したrefにも同じWebViewが渡る", () => {
    const { ref } = renderCard();

    expect(ref.current?.stopLoading).toBe(mockWebView.stopLoading);
  });
});
