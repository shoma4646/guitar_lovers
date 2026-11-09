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

/** 許可ホスト上でも、行き先を自由に指定できる転送用のパス（先頭セグメント、小文字） */
const REDIRECT_PATH_SEGMENTS = ["redirect", "url"] as const;

/** https URLをホスト名（小文字）とパス部分に分ける。ユーザー情報・ポートは除き、ホストが取り出せなければnull */
function splitHttpsUrl(url: string): { host: string; path: string } | null {
  const match = /^https:\/\/([^/?#\\]*)([^?#]*)/i.exec(url);
  if (!match) return null;
  const authority = match[1];
  const host = authority.slice(authority.lastIndexOf("@") + 1).replace(/:\d*$/, "");
  return host === "" ? null : { host: host.toLowerCase(), path: match[2] };
}

/** パスを%復号し、「/」「\」で区切って空・「.」「..」を解決した先頭セグメントを小文字で返す。復号できなければnull */
function firstPathSegment(path: string): string | null {
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
  return (resolved[0] ?? "").toLowerCase();
}

/**
 * プレイヤーの外へ出るURLを外部で開いてよいか
 * httpsで、ホストがEXTERNAL_LINK_HOSTSのいずれかと完全一致し、パスが転送用（/redirect・/url）でないときだけ許可する
 * @param url - 開こうとしているURL
 */
export function isAllowedExternalUrl(url: string): boolean {
  const parts = splitHttpsUrl(url);
  if (parts === null) return false;
  if (!(EXTERNAL_LINK_HOSTS as readonly string[]).includes(parts.host)) return false;
  const segment = firstPathSegment(parts.path);
  return segment !== null && !(REDIRECT_PATH_SEGMENTS as readonly string[]).includes(segment);
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
