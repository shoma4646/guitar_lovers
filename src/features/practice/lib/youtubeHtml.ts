/**
 * YouTube埋め込みのorigin。WebViewのbaseUrlとplayerVars.originの両方に使う
 * （baseUrl無しだとWKWebViewのoriginがnullになり、YouTubeがError 153で埋め込みを拒否するため）
 */
export const YOUTUBE_EMBED_ORIGIN = "https://shoma4646.github.io";

/** 再生中にアプリへ再生位置を送る間隔（シークバー表示用） */
const TIME_POST_INTERVAL_MS = 200;
/** 再生中にB点到達を判定する間隔。B点を過ぎて鳴る音の長さの上限になる */
const LOOP_CHECK_INTERVAL_MS = 50;

/**
 * WebViewに表示するYouTube IFrame APIラッパーHTMLを生成する。
 * postMessageで再生中の再生位置・duration・コマンド受信を扱い、ABループのB点判定と
 * A点への巻き戻しはアプリへの往復を待たずプレイヤー内で行う（区間は setLoop コマンドで受け取る）。
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
    body { background: #1f2a22; }
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
    var TIME_POST_INTERVAL_MS = ${TIME_POST_INTERVAL_MS};
    var LOOP_CHECK_INTERVAL_MS = ${LOOP_CHECK_INTERVAL_MS};
    var loop = { enabled: false, pointA: null, pointB: null };
    var timeTimer = null;
    var loopTimer = null;
    function post(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
    function isLoopActive(range) {
      return range.enabled && range.pointA !== null && range.pointB !== null && range.pointA < range.pointB;
    }
    function shouldSeekToLoopStart(currentTime, range) {
      return isLoopActive(range) && currentTime >= range.pointB;
    }
    function postTime() {
      if (player && player.getCurrentTime) {
        post({ type: 'time', currentTime: player.getCurrentTime() });
      }
    }
    function checkLoop() {
      if (!player || !player.getCurrentTime) return;
      if (shouldSeekToLoopStart(player.getCurrentTime(), loop)) {
        player.seekTo(loop.pointA, true);
        postTime();
      }
    }
    function startPolling() {
      if (timeTimer === null) timeTimer = setInterval(postTime, TIME_POST_INTERVAL_MS);
      if (loopTimer === null) loopTimer = setInterval(checkLoop, LOOP_CHECK_INTERVAL_MS);
    }
    function stopPolling() {
      if (timeTimer !== null) { clearInterval(timeTimer); timeTimer = null; }
      if (loopTimer !== null) { clearInterval(loopTimer); loopTimer = null; }
    }
    function toPoint(value) {
      return typeof value === 'number' && isFinite(value) ? value : null;
    }
    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        videoId: '${safeId}',
        playerVars: { playsinline: 1, start: ${safeStart}, autoplay: 1, origin: '${YOUTUBE_EMBED_ORIGIN}' },
        events: {
          onReady: function(e) {
            e.target.setPlaybackRate(${safeRate});
            e.target.playVideo();
            post({ type: 'ready', duration: e.target.getDuration() });
          },
          onStateChange: function(e) {
            if (e.data === YT.PlayerState.PLAYING) {
              startPolling();
            } else if (e.data === YT.PlayerState.ENDED && isLoopActive(loop)) {
              // B点が動画末尾と重なると50ms判定より先に終了するため、終了時点でも巻き戻す
              player.seekTo(loop.pointA, true);
              player.playVideo();
            } else {
              stopPolling();
              postTime();
            }
          },
          onError: function(e) {
            post({ type: 'error', code: e.data });
          }
        }
      });
    }
    document.addEventListener('message', function(e) { handleMsg(e.data); });
    window.addEventListener('message', function(e) { handleMsg(e.data); });
    function handleMsg(data) {
      try {
        var cmd = JSON.parse(data);
        if (cmd.action === 'setLoop') {
          loop = { enabled: cmd.enabled === true, pointA: toPoint(cmd.pointA), pointB: toPoint(cmd.pointB) };
          return;
        }
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
