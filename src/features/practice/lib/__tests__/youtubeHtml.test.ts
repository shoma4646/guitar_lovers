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
