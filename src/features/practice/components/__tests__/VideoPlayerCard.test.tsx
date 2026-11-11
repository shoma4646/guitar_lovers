import { createRef } from "react";
import { act, render } from "@testing-library/react-native";
import type WebView from "react-native-webview";
import { YOUTUBE_EMBED_ORIGIN } from "@/features/practice/lib/youtubeHtml";
import { VideoPlayerCard } from "../VideoPlayerCard";

type MockWebViewProps = {
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
  mockWebView.props = null;
  mockWebView.stopLoading.mockClear();
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
