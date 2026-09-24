/**
 * YouTube動画プレイヤーカード
 *
 * WebViewのrefはPracticeTab側で所有し（sendToPlayerで使うため）、
 * このコンポーネントはforwardRefで受け渡すだけに留める。
 * ScreenFrameの左右16pxパディングを打ち消し、画面幅いっぱいのフルブリードで表示する。
 */

import { forwardRef } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import WebView from "react-native-webview";
import { buildYouTubeHtml, YOUTUBE_EMBED_ORIGIN } from "@/features/practice/lib/youtubeHtml";
import { SCREEN_HORIZONTAL_PADDING } from "@/shared/constants/layout";

type Props = {
  videoId: string;
  /** 初期再生位置（秒）。フレーズ練習の再開時にA点から始めるために使う */
  startSeconds?: number;
  /** 初期再生速度。フレーズ練習の再開時にそのフレーズの速度から始めるために使う */
  initialRate?: number;
  onTimeUpdate: (time: number) => void;
  onDurationReady: (duration: number) => void;
  /** YouTube IFrame APIのエラーコード、またはWebView自体の読み込み失敗時は-1を渡す */
  onPlayerError: (code: number) => void;
};

export const VideoPlayerCard = forwardRef<WebView, Props>(
  function VideoPlayerCard(
    { videoId, startSeconds = 0, initialRate = 1, onTimeUpdate, onDurationReady, onPlayerError },
    ref,
  ) {
    const { width: screenWidth } = useWindowDimensions();
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
          ref={ref}
          // baseUrl無しだとWKWebViewのoriginがnullになりYouTubeが埋め込みを拒否する
          source={{
            html: buildYouTubeHtml(videoId, startSeconds, initialRate),
            baseUrl: YOUTUBE_EMBED_ORIGIN,
          }}
          style={styles.webView}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === "time") {
                onTimeUpdate(data.currentTime);
              } else if (data.type === "ready") {
                onDurationReady(data.duration);
              } else if (data.type === "error") {
                onPlayerError(typeof data.code === "number" ? data.code : -1);
              }
            } catch {
              // ignore
            }
          }}
          onError={() => onPlayerError(-1)}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  webView: {
    flex: 1,
  },
});
