/**
 * WebViewに表示するYouTube IFrame APIラッパーHTMLを生成する。
 * postMessageで現在再生位置・duration・コマンド受信を扱う。
 */
export function buildYouTubeHtml(videoId: string): string {
  const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, "");
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
    document.head.appendChild(tag);
    var player;
    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        videoId: '${safeId}',
        playerVars: { playsinline: 1 },
        events: {
          onReady: function(e) {
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
