/**
 * YouTubeプレイヤーWebViewの遷移制御とメッセージ検証
 */

import { Linking } from "react-native";
import { YOUTUBE_EMBED_ORIGIN } from "@/features/practice/lib/youtubeHtml";

/** URLがプレイヤーHTMLのorigin（YOUTUBE_EMBED_ORIGIN）配下か */
export function isEmbedOriginUrl(url: string | undefined): boolean {
  if (url === undefined || !url.startsWith(YOUTUBE_EMBED_ORIGIN)) return false;
  const rest = url.slice(YOUTUBE_EMBED_ORIGIN.length);
  return rest === "" || /^[/?#]/.test(rest);
}

/**
 * プレイヤーWebViewのoriginWhitelist
 * 許可リストを外れたURLはWebViewライブラリがアプリの判定を通さず外部アプリで開くため、
 * すべてのURLをhandlePlayerNavigationRequestの判定に回す
 */
export const PLAYER_ORIGIN_WHITELIST: string[] = ["*"];

/** プレイヤーの外へ出る遷移のうち、外部で開いてよいホスト（完全一致。サブドメインは含まない） */
export const EXTERNAL_LINK_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "policies.google.com",
  "support.google.com",
] as const;

/** youtube.com系のホスト。転送用のパスが名前を変えて増えても通さないよう、通してよいパスだけを並べる */
const YOUTUBE_SITE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com"] as const;

/** youtube.com系のホストで外部で開いてよいパスの先頭セグメント（小文字）。トップ（/）と「@ハンドル」は別に許可する */
const YOUTUBE_ALLOWED_FIRST_SEGMENTS = ["watch", "shorts", "channel", "c", "user", "playlist", "embed", "t"] as const;

/** youtu.beの短縮URLのパス（11文字の動画ID） */
const YOUTU_BE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Google系の許可ホスト上でも、行き先を自由に指定できる転送用のパス（先頭セグメント、小文字） */
const REDIRECT_PATH_SEGMENTS = ["redirect", "url"] as const;

/** https URLをホスト名（小文字）とパス部分に分ける。ユーザー情報・ポートは除き、ホストが取り出せなければnull */
function splitHttpsUrl(url: string): { host: string; path: string } | null {
  const match = /^https:\/\/([^/?#\\]*)([^?#]*)/i.exec(url);
  if (!match) return null;
  const authority = match[1];
  const host = authority.slice(authority.lastIndexOf("@") + 1).replace(/:\d*$/, "");
  return host === "" ? null : { host: host.toLowerCase(), path: match[2] };
}

/** パスを%復号し、「/」「\」で区切って空・「.」「..」を解決したセグメントを返す（大文字小文字はそのまま）。復号できなければnull */
function resolvePathSegments(path: string): string[] | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  const resolved: string[] = [];
  for (const segment of decoded.split(/[/\\]/)) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") resolved.pop();
    else resolved.push(segment);
  }
  return resolved;
}

function isAllowedYouTubeSitePath(segments: string[]): boolean {
  const first = segments[0]?.toLowerCase();
  if (first === undefined) return true;
  if (first.length > 1 && first.startsWith("@")) return true;
  return (YOUTUBE_ALLOWED_FIRST_SEGMENTS as readonly string[]).includes(first);
}

/**
 * プレイヤーの外へ出るURLを外部で開いてよいか
 * httpsで、ホストがEXTERNAL_LINK_HOSTSのいずれかと完全一致し、さらにパスが次を満たすときだけ許可する。
 * youtube.com系は動画・チャンネル・再生リスト・利用規約などの許可したパスだけ、youtu.beは動画IDだけ、
 * Google系は転送用（/redirect・/url）以外
 * @param url - 開こうとしているURL
 */
export function isAllowedExternalUrl(url: string): boolean {
  const parts = splitHttpsUrl(url);
  if (parts === null) return false;
  if (!(EXTERNAL_LINK_HOSTS as readonly string[]).includes(parts.host)) return false;
  const segments = resolvePathSegments(parts.path);
  if (segments === null) return false;
  if ((YOUTUBE_SITE_HOSTS as readonly string[]).includes(parts.host)) return isAllowedYouTubeSitePath(segments);
  if (parts.host === "youtu.be") return segments.length === 1 && YOUTU_BE_VIDEO_ID.test(segments[0]);
  return !(REDIRECT_PATH_SEGMENTS as readonly string[]).includes((segments[0] ?? "").toLowerCase());
}

/**
 * プレイヤーWebView内での読み込みを許可するか
 * about:blank・プレイヤーHTMLのorigin配下と、iframe内（isTopFrame:false）のhttps・about:の読み込みだけを許可する
 * @param req.url - 読み込み先のURL
 * @param req.isTopFrame - トップフレームの遷移か（iOSのみ。未指定ならトップフレームとみなす）
 */
export function shouldAllowPlayerNavigation(req: { url: string; isTopFrame?: boolean }): boolean {
  if (req.isTopFrame === false) return /^(https:|about:)/i.test(req.url);
  return req.url === "about:blank" || isEmbedOriginUrl(req.url);
}

/**
 * 読み込みが始まったトップフレームのURLが、プレイヤーが居てはいけないページか
 * 遷移判定（shouldAllowPlayerNavigation）を通らなかったトップフレームの遷移ならtrue
 * @param url - 読み込みが始まったURL
 */
export function isUnexpectedTopNavigation(url: string): boolean {
  return !shouldAllowPlayerNavigation({ url, isTopFrame: true });
}

/** 外部で開いてよいURL（isAllowedExternalUrl）だけをYouTubeアプリかブラウザで開き、それ以外は開かない */
export function openExternally(url: string): void {
  if (!isAllowedExternalUrl(url)) {
    console.warn("[player] 外部で開かないURLへの遷移を止めました", url);
    return;
  }
  Linking.openURL(url).catch((error: unknown) => {
    console.warn("[player] 外部でURLを開けません", url, error);
  });
}

/**
 * onShouldStartLoadWithRequest用。許可しない遷移はWebView内で読み込まず、外部で開いてよいURLなら外部で開く
 * @param req.url - 読み込み先のURL
 * @param req.isTopFrame - トップフレームの遷移か（iOSのみ）
 */
export function handlePlayerNavigationRequest(req: { url: string; isTopFrame?: boolean }): boolean {
  if (shouldAllowPlayerNavigation(req)) return true;
  openExternally(req.url);
  return false;
}

/** プレイヤーHTMLから届くメッセージ */
export type PlayerMessage =
  | { type: "time"; currentTime: number }
  | { type: "ready"; duration: number }
  | { type: "error"; code: number };

/**
 * WebViewのメッセージを検証して取り出す
 * 送信元がプレイヤーHTMLのoriginでない、JSONでない、値が有限の数値でないものはnullを返す
 * @param message.data - postMessageの本文
 * @param message.url - 送信元ページのURL
 */
export function parsePlayerMessage(message: { data: string; url?: string }): PlayerMessage | null {
  if (!isEmbedOriginUrl(message.url)) return null;
  let data: unknown;
  try {
    data = JSON.parse(message.data);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  if (record.type === "time") {
    return Number.isFinite(record.currentTime)
      ? { type: "time", currentTime: record.currentTime as number }
      : null;
  }
  if (record.type === "ready") {
    return Number.isFinite(record.duration)
      ? { type: "ready", duration: record.duration as number }
      : null;
  }
  if (record.type === "error") {
    return { type: "error", code: Number.isFinite(record.code) ? (record.code as number) : -1 };
  }
  return null;
}
