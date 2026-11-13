import { buildYouTubeHtml, YOUTUBE_EMBED_ORIGIN } from "../youtubeHtml";

describe("buildYouTubeHtml", () => {
  it("playerVarsにembed originを含める", () => {
    const html = buildYouTubeHtml("abc123def45");

    expect(html).toContain(`origin: '${YOUTUBE_EMBED_ORIGIN}'`);
  });

  it("videoIdの不正文字を除去する", () => {
    const html = buildYouTubeHtml("abc123<script>");

    expect(html).toContain("videoId: 'abc123script'");
  });

  it("startSecondsとinitialRateを埋め込む", () => {
    const html = buildYouTubeHtml("abc123def45", 42, 1.5);

    expect(html).toContain("start: 42");
    expect(html).toContain("setPlaybackRate(1.5)");
  });
});

const PLAYER_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

type FakePlayer = {
  currentTime: number;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: jest.Mock;
  playVideo: jest.Mock;
  pauseVideo: jest.Mock;
  setPlaybackRate: jest.Mock;
};

type PlayerEvents = {
  onReady: (e: { target: FakePlayer }) => void;
  onStateChange: (e: { data: number }) => void;
};

type PlayerScript = {
  onYouTubeIframeAPIReady: () => void;
  handleMsg: (data: string) => void;
  shouldSeekToLoopStart: (
    currentTime: number,
    range: { enabled: boolean; pointA: number | null; pointB: number | null },
  ) => boolean;
};

/** 生成HTMLの<script>を、YouTube IFrame APIとWebViewブリッジの偽物の上で実行する */
function bootPlayerScript() {
  const html = buildYouTubeHtml("abc123def45", 0, 1);
  const source = /<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "";
  const posted: Record<string, unknown>[] = [];
  const player: FakePlayer = {
    currentTime: 0,
    getCurrentTime: () => player.currentTime,
    getDuration: () => 120,
    seekTo: jest.fn((time: number) => {
      player.currentTime = time;
    }),
    playVideo: jest.fn(),
    pauseVideo: jest.fn(),
    setPlaybackRate: jest.fn(),
  };
  let events: PlayerEvents | null = null;
  const YT = {
    PlayerState: PLAYER_STATE,
    Player: function FakeYTPlayer(_id: string, config: { events: PlayerEvents }) {
      events = config.events;
      return player;
    },
  };
  const fakeWindow = {
    ReactNativeWebView: { postMessage: (msg: string) => posted.push(JSON.parse(msg)) },
    addEventListener: jest.fn(),
  };
  const fakeDocument = {
    createElement: () => ({}),
    head: { appendChild: jest.fn() },
    addEventListener: jest.fn(),
  };
  const run = new Function(
    "window",
    "document",
    "YT",
    `${source}\nreturn { onYouTubeIframeAPIReady, handleMsg, shouldSeekToLoopStart };`,
  ) as (w: unknown, d: unknown, yt: unknown) => PlayerScript;
  const script = run(fakeWindow, fakeDocument, YT);
  script.onYouTubeIframeAPIReady();
  const fire = () => {
    if (events === null) throw new Error("YT.Player が生成されていない");
    return events;
  };
  const listenerOf = (target: { addEventListener: jest.Mock }) => {
    const call = target.addEventListener.mock.calls.find(([type]) => type === "message");
    if (!call) throw new Error("message リスナーが登録されていない");
    return call[1] as (e: { source: unknown; origin: string; data: string }) => void;
  };
  return {
    script,
    player,
    posted,
    fire,
    windowListener: listenerOf(fakeWindow),
    documentListener: listenerOf(fakeDocument),
  };
}

function timeMessages(posted: Record<string, unknown>[]) {
  return posted.filter((m) => m.type === "time");
}

describe("プレイヤーHTML内のABループ判定", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("shouldSeekToLoopStart", () => {
    it("ループ有効・A/B両方設定済み・B点到達で真", () => {
      const { script } = bootPlayerScript();
      const range = { enabled: true, pointA: 10, pointB: 20 };
      expect(script.shouldSeekToLoopStart(20, range)).toBe(true);
      expect(script.shouldSeekToLoopStart(25, range)).toBe(true);
      expect(script.shouldSeekToLoopStart(19.9, range)).toBe(false);
    });

    it("ループ無効・どちらかの点が未設定・区間が逆転なら偽", () => {
      const { script } = bootPlayerScript();
      expect(script.shouldSeekToLoopStart(25, { enabled: false, pointA: 10, pointB: 20 })).toBe(false);
      expect(script.shouldSeekToLoopStart(25, { enabled: true, pointA: 10, pointB: null })).toBe(false);
      expect(script.shouldSeekToLoopStart(25, { enabled: true, pointA: null, pointB: 20 })).toBe(false);
      expect(script.shouldSeekToLoopStart(25, { enabled: true, pointA: 20, pointB: 20 })).toBe(false);
    });
  });

  it("setLoopで受けた区間を、再生中だけ50ms間隔で判定してA点へ戻す", () => {
    const { script, player, fire } = bootPlayerScript();
    script.handleMsg(JSON.stringify({ action: "setLoop", enabled: true, pointA: 10, pointB: 12.3 }));
    fire().onStateChange({ data: PLAYER_STATE.PLAYING });

    player.currentTime = 12.31;
    jest.advanceTimersByTime(50);
    expect(player.seekTo).toHaveBeenCalledWith(10, true);
  });

  it("一時停止中はB点を過ぎていても判定しない", () => {
    const { script, player, fire } = bootPlayerScript();
    script.handleMsg(JSON.stringify({ action: "setLoop", enabled: true, pointA: 10, pointB: 12.3 }));
    fire().onStateChange({ data: PLAYER_STATE.PLAYING });
    fire().onStateChange({ data: PLAYER_STATE.PAUSED });

    player.currentTime = 13;
    jest.advanceTimersByTime(1000);
    expect(player.seekTo).not.toHaveBeenCalled();
  });

  it("ループ無効の区間を受けたら巻き戻さない", () => {
    const { script, player, fire } = bootPlayerScript();
    script.handleMsg(JSON.stringify({ action: "setLoop", enabled: false, pointA: 10, pointB: 12.3 }));
    fire().onStateChange({ data: PLAYER_STATE.PLAYING });

    player.currentTime = 13;
    jest.advanceTimersByTime(200);
    expect(player.seekTo).not.toHaveBeenCalled();
  });

  it("B点と動画末尾が重なって終了したらA点から再生し直す", () => {
    const { script, player, fire } = bootPlayerScript();
    script.handleMsg(JSON.stringify({ action: "setLoop", enabled: true, pointA: 10, pointB: 120 }));
    fire().onStateChange({ data: PLAYER_STATE.ENDED });

    expect(player.seekTo).toHaveBeenCalledWith(10, true);
    expect(player.playVideo).toHaveBeenCalled();
  });

  it("再生位置は再生中だけ200msごとに送り、一時停止で最後の位置を1回だけ送って止める", () => {
    const { player, posted, fire } = bootPlayerScript();
    fire().onReady({ target: player });
    expect(timeMessages(posted)).toHaveLength(0);

    fire().onStateChange({ data: PLAYER_STATE.PLAYING });
    jest.advanceTimersByTime(600);
    expect(timeMessages(posted)).toHaveLength(3);

    player.currentTime = 42;
    fire().onStateChange({ data: PLAYER_STATE.PAUSED });
    expect(timeMessages(posted)).toHaveLength(4);
    expect(timeMessages(posted).at(-1)).toEqual({ type: "time", currentTime: 42 });

    jest.advanceTimersByTime(2000);
    expect(timeMessages(posted)).toHaveLength(4);
  });

  it("準備完了前にsetLoopを受けても区間を保持する", () => {
    const { script, player, fire } = bootPlayerScript();
    script.handleMsg(JSON.stringify({ action: "setLoop", enabled: true, pointA: 1, pointB: 2 }));
    fire().onReady({ target: player });
    fire().onStateChange({ data: PLAYER_STATE.PLAYING });

    player.currentTime = 2.05;
    jest.advanceTimersByTime(50);
    expect(player.seekTo).toHaveBeenCalledWith(1, true);
  });
});

describe("プレイヤーHTMLの命令受信", () => {
  const COMMANDS = {
    pause: { action: "pause" },
    play: { action: "play" },
    setLoop: { action: "setLoop", enabled: false, pointA: null, pointB: null },
    seek: { action: "seek", time: 30 },
    setRate: { action: "setRate", rate: 2 },
  };

  function fromFrame(cmd: Record<string, unknown>) {
    return { source: {}, origin: "https://example.com", data: JSON.stringify(cmd) };
  }

  function fromApp(cmd: Record<string, unknown>) {
    return { source: null, origin: "", data: JSON.stringify(cmd) };
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("windowに別の枠から届いた命令は実行しない", () => {
    const { player, windowListener } = bootPlayerScript();
    windowListener(fromFrame(COMMANDS.pause));
    windowListener(fromFrame(COMMANDS.play));
    windowListener(fromFrame(COMMANDS.seek));
    windowListener(fromFrame(COMMANDS.setRate));

    expect(player.pauseVideo).not.toHaveBeenCalled();
    expect(player.playVideo).not.toHaveBeenCalled();
    expect(player.seekTo).not.toHaveBeenCalled();
    expect(player.setPlaybackRate).not.toHaveBeenCalled();
  });

  it("windowに別の枠から届いたsetLoopではABループが外れない", () => {
    const { script, player, fire, windowListener } = bootPlayerScript();
    script.handleMsg(JSON.stringify({ action: "setLoop", enabled: true, pointA: 10, pointB: 12 }));
    windowListener(fromFrame(COMMANDS.setLoop));
    fire().onStateChange({ data: PLAYER_STATE.PLAYING });

    player.currentTime = 12.5;
    jest.advanceTimersByTime(50);
    expect(player.seekTo).toHaveBeenCalledWith(10, true);
  });

  it("windowにアプリから届いた命令（sourceがnull）は実行する", () => {
    const { player, windowListener } = bootPlayerScript();
    windowListener(fromApp(COMMANDS.pause));
    windowListener(fromApp(COMMANDS.seek));
    windowListener(fromApp(COMMANDS.setRate));

    expect(player.pauseVideo).toHaveBeenCalledTimes(1);
    expect(player.seekTo).toHaveBeenCalledWith(30, true);
    expect(player.setPlaybackRate).toHaveBeenCalledWith(2);
  });

  it("windowにアプリから届いたsetLoopでABループを外せる", () => {
    const { script, player, fire, windowListener } = bootPlayerScript();
    script.handleMsg(JSON.stringify({ action: "setLoop", enabled: true, pointA: 10, pointB: 12 }));
    windowListener(fromApp(COMMANDS.setLoop));
    fire().onStateChange({ data: PLAYER_STATE.PLAYING });

    player.currentTime = 12.5;
    jest.advanceTimersByTime(50);
    expect(player.seekTo).not.toHaveBeenCalled();
  });

  it("documentに届いた命令（Androidのアプリからの経路）は従来どおり実行する", () => {
    const { player, documentListener } = bootPlayerScript();
    documentListener(fromApp(COMMANDS.pause));
    documentListener(fromApp(COMMANDS.play));
    documentListener(fromApp(COMMANDS.seek));
    documentListener(fromApp(COMMANDS.setRate));

    expect(player.pauseVideo).toHaveBeenCalledTimes(1);
    expect(player.playVideo).toHaveBeenCalledTimes(1);
    expect(player.seekTo).toHaveBeenCalledWith(30, true);
    expect(player.setPlaybackRate).toHaveBeenCalledWith(2);
  });

  it.each([["abc"], [-1], [null], [Number.POSITIVE_INFINITY], ["30"]])(
    "seekの位置が有限の0以上の数でない（%p）なら実行しない",
    (time) => {
      const { script, player } = bootPlayerScript();
      script.handleMsg(JSON.stringify({ action: "seek", time }));

      expect(player.seekTo).not.toHaveBeenCalled();
    },
  );

  it("seekの位置0は実行する", () => {
    const { script, player } = bootPlayerScript();
    script.handleMsg(JSON.stringify({ action: "seek", time: 0 }));

    expect(player.seekTo).toHaveBeenCalledWith(0, true);
  });

  it.each([[0], [-1], [Number.NaN], ["2"], [null]])(
    "setRateの速度が有限の正の数でない（%p）なら実行しない",
    (rate) => {
      const { script, player } = bootPlayerScript();
      script.handleMsg(JSON.stringify({ action: "setRate", rate }));

      expect(player.setPlaybackRate).not.toHaveBeenCalled();
    },
  );
});
