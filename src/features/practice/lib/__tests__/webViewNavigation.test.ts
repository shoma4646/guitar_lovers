import * as fc from "fast-check";
import { Linking } from "react-native";
import {
  EXTERNAL_LINK_HOSTS,
  handlePlayerNavigationRequest,
  isAllowedExternalUrl,
  isEmbedOriginUrl,
  isUnexpectedTopNavigation,
  openExternally,
  parsePlayerMessage,
  shouldAllowPlayerNavigation,
} from "../webViewNavigation";
import { YOUTUBE_EMBED_ORIGIN } from "../youtubeHtml";

describe("shouldAllowPlayerNavigation", () => {
  it("about:blank・プレイヤーHTMLのorigin配下・iframe内のembedは許可する", () => {
    expect(shouldAllowPlayerNavigation({ url: "about:blank", isTopFrame: true })).toBe(true);
    expect(shouldAllowPlayerNavigation({ url: YOUTUBE_EMBED_ORIGIN, isTopFrame: true })).toBe(true);
    expect(shouldAllowPlayerNavigation({ url: `${YOUTUBE_EMBED_ORIGIN}/`, isTopFrame: true })).toBe(
      true,
    );
    expect(
      shouldAllowPlayerNavigation({ url: "https://www.youtube.com/embed/xxx", isTopFrame: false }),
    ).toBe(true);
  });

  it("トップフレームでのYouTubeサイトや外部サイトへの遷移は許可しない", () => {
    expect(
      shouldAllowPlayerNavigation({ url: "https://www.youtube.com/watch?v=xxx", isTopFrame: true }),
    ).toBe(false);
    expect(shouldAllowPlayerNavigation({ url: "https://example.com", isTopFrame: true })).toBe(false);
  });

  it("isTopFrameが無い（Android）遷移はトップフレームとして扱う", () => {
    expect(shouldAllowPlayerNavigation({ url: "https://www.youtube.com/watch?v=xxx" })).toBe(false);
    expect(shouldAllowPlayerNavigation({ url: `${YOUTUBE_EMBED_ORIGIN}/` })).toBe(true);
  });

  it("originを前方一致で偽装したホストは許可しない", () => {
    expect(
      shouldAllowPlayerNavigation({ url: `${YOUTUBE_EMBED_ORIGIN}.example.com/`, isTopFrame: true }),
    ).toBe(false);
    expect(isEmbedOriginUrl(`${YOUTUBE_EMBED_ORIGIN}@example.com`)).toBe(false);
  });
});

describe("shouldAllowPlayerNavigation（iframe内のスキーム）", () => {
  it.each(["tel:123", "sms:123", "intent://scan/#Intent;scheme=zxing;end", "itms-apps://apps.apple.com/app/id1", "javascript:alert(1)"])(
    "iframe内でも %s への遷移は許可しない",
    (url) => {
      expect(shouldAllowPlayerNavigation({ url, isTopFrame: false })).toBe(false);
    },
  );

  it("iframe内の https と about: の読み込みは許可する", () => {
    expect(shouldAllowPlayerNavigation({ url: "https://googleads.g.doubleclick.net/x", isTopFrame: false })).toBe(true);
    expect(shouldAllowPlayerNavigation({ url: "about:srcdoc", isTopFrame: false })).toBe(true);
  });

  it("iframe内でも http: の読み込みは許可しない", () => {
    expect(shouldAllowPlayerNavigation({ url: "http://www.youtube.com/embed/xxx", isTopFrame: false })).toBe(false);
    expect(shouldAllowPlayerNavigation({ url: "HTTP://example.com/", isTopFrame: false })).toBe(false);
  });
});

describe("isAllowedExternalUrl", () => {
  it.each([
    "https://www.youtube.com/watch?v=x",
    "https://youtube.com/watch?v=x",
    "https://m.youtube.com/watch?v=x",
    "https://youtu.be/x",
    "https://policies.google.com/privacy",
    "https://WWW.YOUTUBE.COM/watch?v=x",
    "https://www.youtube.com:443/watch?v=x",
  ])("%s は外部で開いてよい", (url) => {
    expect(isAllowedExternalUrl(url)).toBe(true);
  });

  it.each([
    "https://example.com",
    "http://www.youtube.com/watch?v=x",
    "tel:123",
    "sms:123",
    "itms-apps://apps.apple.com/app/id1",
    "intent://www.youtube.com/#Intent;end",
    "https://www.youtube.com.example.com/",
    "https://example.com/?u=youtube.com",
    "https://www.youtube.com@example.com/",
    "https://example.com\\@www.youtube.com/",
    "https://notyoutube.com/",
    "https://google.com.evil.com/",
    "https:///www.youtube.com",
  ])("%s は外部で開かない", (url) => {
    expect(isAllowedExternalUrl(url)).toBe(false);
  });

  it.each([
    "https://www.youtube.com/redirect?q=https://example.com",
    "https://www.google.com/url?q=https://example.com",
    "https://sites.google.com/view/anything",
    "https://script.google.com/macros/s/x/exec",
    "https://docs.google.com/forms/d/x/viewform",
  ])("行き先を指定できる転送URL・誰でもページを置けるホスト %s は外部で開かない", (url) => {
    expect(isAllowedExternalUrl(url)).toBe(false);
  });

  it.each([
    "https://m.youtube.com/redirect?q=https://example.com",
    "https://youtube.com/redirect/?q=https://example.com",
    "https://www.youtube.com/REDIRECT?q=https://example.com",
    "https://www.youtube.com/%72edirect?q=https://example.com",
    "https://www.youtube.com//redirect?q=https://example.com",
    "https://www.youtube.com/./redirect?q=https://example.com",
    "https://www.youtube.com\\redirect?q=https://example.com",
    "https://www.youtube.com/redirect#x",
    "https://policies.google.com/url?q=https://example.com",
    "https://google.com/url?q=https://example.com",
    "https://www.youtube.com/watch/../redirect?q=https://example.com",
    "https://www.youtube.com/%2Fredirect?q=https://example.com",
    "https://www.youtube.com/%E0%A4%A",
  ])("許可ホストでも転送パスの %s は外部で開かない", (url) => {
    expect(isAllowedExternalUrl(url)).toBe(false);
  });

  it.each([
    "https://www.youtube.com/redirects-guide",
    "https://www.youtube.com/watch?v=x&next=/redirect",
    "https://support.google.com/youtube/answer/1",
    "https://www.youtube.com/channel/url",
  ])("転送パスに似ているだけの %s は外部で開いてよい", (url) => {
    expect(isAllowedExternalUrl(url)).toBe(true);
  });

  it("許可リスト外のホスト、または /redirect・/url のパスなら開かない", () => {
    const label = fc.stringMatching(/^[a-z0-9-]{1,12}$/);
    const host = fc.oneof(
      fc.array(label, { minLength: 1, maxLength: 4 }).map((labels) => labels.join(".")),
      fc
        .tuple(label, fc.constantFrom("youtube.com", "youtu.be", "google.com"))
        .map(([sub, domain]) => `${sub}.${domain}`),
    );
    const isListedHost = (h: string) => (EXTERNAL_LINK_HOSTS as readonly string[]).includes(h);
    const blockedHost = host.filter((h) => !isListedHost(h)).map((h) => ({ h, path: "/watch" }));
    const blockedPath = fc
      .tuple(
        fc.constantFrom(...EXTERNAL_LINK_HOSTS),
        fc.constantFrom("/redirect", "/url", "/Redirect", "/URL", "/redirect/", "/url/x"),
        fc.constantFrom("", "?q=https://example.com", "#x"),
      )
      .map(([h, path, rest]) => ({ h, path: `${path}${rest}` }));
    fc.assert(
      fc.property(fc.oneof(blockedHost, blockedPath), ({ h, path }) => {
        expect(isAllowedExternalUrl(`https://${h}${path}`)).toBe(false);
      }),
    );
  });

  it("許可リストのホストの転送パス以外は開いてよい", () => {
    fc.assert(
      fc.property(fc.constantFrom(...EXTERNAL_LINK_HOSTS), fc.webPath(), (h, path) => {
        fc.pre(!/redirect|url|\.\.|%/i.test(path));
        expect(isAllowedExternalUrl(`https://${h}${path}`)).toBe(true);
      }),
    );
  });
});

describe("isUnexpectedTopNavigation", () => {
  it("YouTubeサイトや外部サイトのページはプレイヤーが居てはいけないページとみなす", () => {
    expect(isUnexpectedTopNavigation("https://www.youtube.com/watch?v=x")).toBe(true);
    expect(isUnexpectedTopNavigation("https://example.com")).toBe(true);
  });

  it("about:blankとプレイヤーHTMLのorigin配下はプレイヤーのページとみなす", () => {
    expect(isUnexpectedTopNavigation("about:blank")).toBe(false);
    expect(isUnexpectedTopNavigation(YOUTUBE_EMBED_ORIGIN)).toBe(false);
    expect(isUnexpectedTopNavigation(`${YOUTUBE_EMBED_ORIGIN}/`)).toBe(false);
    expect(isUnexpectedTopNavigation(`${YOUTUBE_EMBED_ORIGIN}/?v=1#x`)).toBe(false);
  });

  it("トップフレームの遷移判定で許可されるURLとちょうど逆になる", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.webUrl(),
          fc.webPath().map((path) => `${YOUTUBE_EMBED_ORIGIN}${path}`),
          fc.constant("about:blank"),
          fc.string(),
        ),
        (url) => {
          expect(isUnexpectedTopNavigation(url)).toBe(
            !shouldAllowPlayerNavigation({ url, isTopFrame: true }),
          );
        },
      ),
    );
  });
});

describe("openExternally", () => {
  let openURL: jest.SpyInstance;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    openURL.mockRestore();
    warn.mockRestore();
  });

  it("YouTubeのURLはLinking.openURLで開く", () => {
    openExternally("https://www.youtube.com/watch?v=x");
    openExternally("https://youtu.be/x");
    expect(openURL).toHaveBeenCalledTimes(2);
  });

  it.each(["https://example.com", "http://www.youtube.com", "tel:123", "sms:123", "itms-apps://apps.apple.com/app/id1"])(
    "%s は開かずに警告だけ出す",
    (url) => {
      openExternally(url);
      expect(openURL).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();
    },
  );
});

describe("handlePlayerNavigationRequest", () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  afterEach(() => {
    openURL.mockRestore();
  });

  it("許可しない遷移は外部で開き、WebView内では読み込まない", () => {
    const url = "https://www.youtube.com/watch?v=xxx";
    expect(handlePlayerNavigationRequest({ url, isTopFrame: true })).toBe(false);
    expect(openURL).toHaveBeenCalledWith(url);
  });

  it.each(["https://example.com", "tel:123", "sms:123", "itms-apps://apps.apple.com/app/id1", "intent://x#Intent;end"])(
    "トップフレームの %s はWebView内で読み込まず、外部でも開かない",
    (url) => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      expect(handlePlayerNavigationRequest({ url, isTopFrame: true })).toBe(false);
      expect(openURL).not.toHaveBeenCalled();
      warn.mockRestore();
    },
  );

  it.each([
    "https://www.youtube.com/redirect?q=https://example.com",
    "https://www.google.com/url?q=https://example.com",
    "https://sites.google.com/view/anything",
    "https://script.google.com/macros/s/x/exec",
    "https://docs.google.com/forms/d/x/viewform",
  ])("トップフレームの %s はWebView内で読み込まず、外部でも開かない", (url) => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(handlePlayerNavigationRequest({ url, isTopFrame: true })).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it.each(["https://www.youtube.com/watch?v=x", "https://youtu.be/x", "https://policies.google.com/privacy"])(
    "トップフレームの %s は従来どおり外部で開く",
    (url) => {
      expect(handlePlayerNavigationRequest({ url, isTopFrame: true })).toBe(false);
      expect(openURL).toHaveBeenCalledWith(url);
    },
  );

  it("iframe内の tel: は読み込まず、外部でも開かない", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(handlePlayerNavigationRequest({ url: "tel:123", isTopFrame: false })).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("許可する遷移は外部で開かない", () => {
    expect(
      handlePlayerNavigationRequest({ url: "https://www.youtube.com/embed/xxx", isTopFrame: false }),
    ).toBe(true);
    expect(openURL).not.toHaveBeenCalled();
  });

  it("外部で開けなくても例外を投げない", async () => {
    openURL.mockRejectedValue(new Error("no handler"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(
      handlePlayerNavigationRequest({ url: "https://www.youtube.com/watch?v=xxx", isTopFrame: true }),
    ).toBe(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("parsePlayerMessage", () => {
  const url = `${YOUTUBE_EMBED_ORIGIN}/`;

  it("プレイヤーHTMLからの再生位置・長さ・エラーを取り出す", () => {
    expect(parsePlayerMessage({ data: '{"type":"time","currentTime":12.5}', url })).toEqual({
      type: "time",
      currentTime: 12.5,
    });
    expect(parsePlayerMessage({ data: '{"type":"ready","duration":180}', url })).toEqual({
      type: "ready",
      duration: 180,
    });
    expect(parsePlayerMessage({ data: '{"type":"error","code":150}', url })).toEqual({
      type: "error",
      code: 150,
    });
  });

  it("エラーコードが数値でなければ-1として扱う", () => {
    expect(parsePlayerMessage({ data: '{"type":"error"}', url })).toEqual({
      type: "error",
      code: -1,
    });
  });

  it("別originのページからのメッセージは無視する", () => {
    const data = '{"type":"time","currentTime":12.5}';
    expect(parsePlayerMessage({ data, url: "https://m.youtube.com/watch?v=xxx" })).toBeNull();
    expect(parsePlayerMessage({ data, url: undefined })).toBeNull();
  });

  it("currentTime・durationが有限の数値でないメッセージは無視する", () => {
    expect(parsePlayerMessage({ data: '{"type":"time","currentTime":"12"}', url })).toBeNull();
    expect(parsePlayerMessage({ data: '{"type":"time"}', url })).toBeNull();
    expect(parsePlayerMessage({ data: '{"type":"ready","duration":null}', url })).toBeNull();
  });

  it("JSONでない・未知のtypeのメッセージは無視する", () => {
    expect(parsePlayerMessage({ data: "not json", url })).toBeNull();
    expect(parsePlayerMessage({ data: "null", url })).toBeNull();
    expect(parsePlayerMessage({ data: '{"type":"other"}', url })).toBeNull();
  });
});
