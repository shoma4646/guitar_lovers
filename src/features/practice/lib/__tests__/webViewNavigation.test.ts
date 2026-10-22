import { Linking } from "react-native";
import {
  handlePlayerNavigationRequest,
  isEmbedOriginUrl,
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

  it("許可する遷移は外部で開かない", () => {
    expect(
      handlePlayerNavigationRequest({ url: "https://www.youtube.com/embed/xxx", isTopFrame: false }),
    ).toBe(true);
    expect(openURL).not.toHaveBeenCalled();
  });

  it("外部で開けなくても例外を投げない", async () => {
    openURL.mockRejectedValue(new Error("no handler"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(handlePlayerNavigationRequest({ url: "https://example.com", isTopFrame: true })).toBe(
      false,
    );
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
