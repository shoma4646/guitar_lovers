/**
 * YouTube動画プレイヤーカード
 *
 * WebViewのrefはPracticeTab側で所有し（sendToPlayerで使うため）、
 * このコンポーネントはforwardRefで受け渡すだけに留める。
 */

import { forwardRef } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import WebView from "react-native-webview";
import { buildYouTubeHtml, YOUTUBE_EMBED_ORIGIN } from "@/features/practice/lib/youtubeHtml";
import { cardShadowStyle } from "./cardStyle";

const SCREEN_WIDTH = Dimensions.get("window").width;

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
    return (
      <View
        className="bg-surface-container-highest overflow-hidden"
        style={[styles.videoCard, cardShadowStyle]}
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
  videoCard: {
    height: (SCREEN_WIDTH - 40) * (9 / 16),
    minHeight: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  webView: {
    flex: 1,
    borderRadius: 16,
  },
});
