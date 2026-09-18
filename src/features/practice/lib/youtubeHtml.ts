/**
 * YouTube埋め込みのorigin。WebViewのbaseUrlとplayerVars.originの両方に使う
 * （baseUrl無しだとWKWebViewのoriginがnullになり、YouTubeがError 153で埋め込みを拒否するため）
 */
export const YOUTUBE_EMBED_ORIGIN = "https://shoma4646.github.io";

/**
 * WebViewに表示するYouTube IFrame APIラッパーHTMLを生成する。
 * postMessageで現在再生位置・duration・コマンド受信を扱う。
 * @param videoId - YouTube動画ID
 * @param startSeconds - 再生開始位置（秒）。フレーズ練習の再開時に、初回シークの
 *   postMessageレース（player未初期化時に送ると無視される）を避けるため
 *   playerVars.startへ焼き込む
 * @param initialRate - 初期再生速度。同じ理由でonReady内で直接setPlaybackRateする
 */
export function buildYouTubeHtml(
  videoId: string,
  startSeconds = 0,
  initialRate = 1,
): string {
  const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeStart = Math.max(0, Math.floor(startSeconds));
  const safeRate = Number.isFinite(initialRate) && initialRate > 0 ? initialRate : 1;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0B0F19; }
    #player { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script>
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    // オフライン時はscriptの読み込み自体が失敗しonErrorが発火しないため、ここで通知する
    tag.onerror = function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', code: -1 }));
    };
    document.head.appendChild(tag);
    var player;
    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        videoId: '${safeId}',
        playerVars: { playsinline: 1, start: ${safeStart}, autoplay: 1, origin: '${YOUTUBE_EMBED_ORIGIN}' },
        events: {
          onReady: function(e) {
            e.target.setPlaybackRate(${safeRate});
            e.target.playVideo();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ready', duration: e.target.getDuration()
            }));
            setInterval(function() {
              if (player && player.getCurrentTime) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'time', currentTime: player.getCurrentTime()
                }));
              }
            }, 200);
          },
          onError: function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error', code: e.data
            }));
          }
        }
      });
    }
    document.addEventListener('message', function(e) { handleMsg(e.data); });
    window.addEventListener('message', function(e) { handleMsg(e.data); });
    function handleMsg(data) {
      try {
        var cmd = JSON.parse(data);
        if (cmd.action === 'play') player.playVideo();
        if (cmd.action === 'pause') player.pauseVideo();
        if (cmd.action === 'seek') player.seekTo(cmd.time, true);
        if (cmd.action === 'setRate') player.setPlaybackRate(cmd.rate);
      } catch(e) {}
    }
  </script>
</body>
</html>
`;
}
