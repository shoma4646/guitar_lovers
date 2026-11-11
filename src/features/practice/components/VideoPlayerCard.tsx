/**
 * YouTube動画プレイヤーカード
 *
 * WebViewのrefはPracticeTab側で所有し（sendToPlayerで使うため）、
 * このコンポーネントはforwardRefで受け渡し、内部では想定外の遷移を止めるためだけに参照する。
 * ScreenFrameの左右16pxパディングを打ち消し、画面幅いっぱいのフルブリードで表示する。
 */

import { forwardRef, memo, useCallback, useRef, useState, type ForwardedRef } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import WebView from "react-native-webview";
import {
  handlePlayerNavigationRequest,
  isUnexpectedTopNavigation,
  openExternally,
  parsePlayerMessage,
  PLAYER_ORIGIN_WHITELIST,
} from "@/features/practice/lib/webViewNavigation";
import { buildYouTubeHtml, YOUTUBE_EMBED_ORIGIN } from "@/features/practice/lib/youtubeHtml";
import { SCREEN_HORIZONTAL_PADDING } from "@/shared/constants/layout";

type Props = {
  videoId: string;
  /** 初期再生位置（秒）。フレーズ練習の再開時にA点から始めるために使う。マウント時の値だけを使う */
  startSeconds?: number;
  /** 初期再生速度。フレーズ練習の再開時にそのフレーズの速度から始めるために使う。マウント時の値だけを使う */
  initialRate?: number;
  onTimeUpdate: (time: number) => void;
  onDurationReady: (duration: number) => void;
  /** YouTube IFrame APIのエラーコード、またはWebView自体の読み込み失敗時は-1を渡す */
  onPlayerError: (code: number) => void;
  /** プレイヤー枠がプレイヤーHTML以外のページへ置き換わり始めたとき。読み込みは止めてあり、呼び出し側でプレイヤーを作り直す */
  onUnexpectedNavigation: () => void;
};

/** forwardRefで受け取ったref（関数・オブジェクトのどちらでも）へWebViewを渡す */
function assignRef(ref: ForwardedRef<WebView>, value: WebView | null): void {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

export const VideoPlayerCard = memo(
  forwardRef<WebView, Props>(function VideoPlayerCard(
    {
      videoId,
      startSeconds = 0,
      initialRate = 1,
      onTimeUpdate,
      onDurationReady,
      onPlayerError,
      onUnexpectedNavigation,
    },
    ref,
  ) {
    const { width: screenWidth } = useWindowDimensions();
    // sourceが変わるとWebViewがページごと読み込み直すため、作り直しはkeyの変更（再マウント）だけに任せる
    const [source] = useState(() => ({
      html: buildYouTubeHtml(videoId, startSeconds, initialRate),
      baseUrl: YOUTUBE_EMBED_ORIGIN,
    }));
    const webViewRef = useRef<WebView | null>(null);
    const setWebViewRef = useCallback(
      (webView: WebView | null) => {
        webViewRef.current = webView;
        assignRef(ref, webView);
      },
      [ref],
    );
    return (
      <View
        className="bg-surface-container-highest overflow-hidden"
        style={{
          width: screenWidth,
          height: Math.round(screenWidth * (9 / 16)),
          marginHorizontal: -SCREEN_HORIZONTAL_PADDING,
        }}
      >
        <WebView
          ref={setWebViewRef}
          // baseUrl無しだとWKWebViewのoriginがnullになりYouTubeが埋め込みを拒否する
          source={source}
          style={styles.webView}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={PLAYER_ORIGIN_WHITELIST}
          onShouldStartLoadWithRequest={handlePlayerNavigationRequest}
          // AndroidのWebViewは遷移判定の返事を250msしか待たず、間に合わなければ許可して進むため事後にも止める
          onLoadStart={(event) => {
            if (!isUnexpectedTopNavigation(event.nativeEvent.url)) return;
            webViewRef.current?.stopLoading();
            onUnexpectedNavigation();
          }}
          onOpenWindow={(event) => openExternally(event.nativeEvent.targetUrl)}
          onMessage={(event) => {
            const message = parsePlayerMessage(event.nativeEvent);
            if (message?.type === "time") {
              onTimeUpdate(message.currentTime);
            } else if (message?.type === "ready") {
              onDurationReady(message.duration);
            } else if (message?.type === "error") {
              onPlayerError(message.code);
            }
          }}
          onError={() => onPlayerError(-1)}
        />
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  webView: {
    flex: 1,
  },
});
