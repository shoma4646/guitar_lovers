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

/** プレイヤーの外へ出る遷移のうち、外部で開いてよいホスト（その配下のサブドメインも含む） */
export const EXTERNAL_LINK_HOSTS = ["youtube.com", "youtu.be", "google.com"] as const;

/** https URLのホスト名を小文字で取り出す。ユーザー情報・ポートは除き、取り出せなければnull */
function extractHttpsHost(url: string): string | null {
  const match = /^https:\/\/([^/?#\\]*)/i.exec(url);
  if (!match) return null;
  const authority = match[1];
  const host = authority.slice(authority.lastIndexOf("@") + 1).replace(/:\d*$/, "");
  return host === "" ? null : host.toLowerCase();
}

/**
 * プレイヤーの外へ出るURLを外部で開いてよいか
 * httpsで、ホストがEXTERNAL_LINK_HOSTSのいずれかかその配下のときだけ許可する
 * @param url - 開こうとしているURL
 */
export function isAllowedExternalUrl(url: string): boolean {
  const host = extractHttpsHost(url);
  if (host === null) return false;
  return EXTERNAL_LINK_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/**
 * プレイヤーWebView内での読み込みを許可するか
 * about:blank・プレイヤーHTMLのorigin配下と、iframe内（isTopFrame:false）のhttp(s)・about:の読み込みだけを許可する
 * @param req.url - 読み込み先のURL
 * @param req.isTopFrame - トップフレームの遷移か（iOSのみ。未指定ならトップフレームとみなす）
 */
export function shouldAllowPlayerNavigation(req: { url: string; isTopFrame?: boolean }): boolean {
  if (req.isTopFrame === false) return /^(https?:|about:)/i.test(req.url);
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
