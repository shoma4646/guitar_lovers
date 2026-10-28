import * as fc from "fast-check";
import { Linking } from "react-native";
import {
  EXTERNAL_LINK_HOSTS,
  handlePlayerNavigationRequest,
  isAllowedExternalUrl,
  isEmbedOriginUrl,
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

  it("iframe内の http(s) と about: の読み込みは許可する", () => {
    expect(shouldAllowPlayerNavigation({ url: "https://googleads.g.doubleclick.net/x", isTopFrame: false })).toBe(true);
    expect(shouldAllowPlayerNavigation({ url: "about:srcdoc", isTopFrame: false })).toBe(true);
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

  it("許可ドメインかその配下でない生成ホストは必ず開かない", () => {
    const label = fc.stringMatching(/^[a-z0-9-]{1,12}$/);
    const host = fc.array(label, { minLength: 1, maxLength: 4 }).map((labels) => labels.join("."));
    const isAllowedHost = (h: string) =>
      EXTERNAL_LINK_HOSTS.some((domain) => h === domain || h.endsWith(`.${domain}`));
    fc.assert(
      fc.property(host, fc.webPath(), (h, path) => {
        fc.pre(!isAllowedHost(h));
        expect(isAllowedExternalUrl(`https://${h}${path}`)).toBe(false);
      }),
    );
  });

  it("許可ドメインの配下に生成したサブドメインは開いてよい", () => {
    const label = fc.stringMatching(/^[a-z0-9-]{1,12}$/);
    fc.assert(
      fc.property(label, fc.constantFrom(...EXTERNAL_LINK_HOSTS), (sub, domain) => {
        expect(isAllowedExternalUrl(`https://${sub}.${domain}/x`)).toBe(true);
      }),
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
