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
 * プレイヤーWebView内での読み込みを許可するか
 * about:blank・プレイヤーHTMLのorigin配下・iframe内（isTopFrame:false）の読み込みだけを許可する
 * @param req.url - 読み込み先のURL
 * @param req.isTopFrame - トップフレームの遷移か（iOSのみ。未指定ならトップフレームとみなす）
 */
export function shouldAllowPlayerNavigation(req: { url: string; isTopFrame?: boolean }): boolean {
  if (req.isTopFrame === false) return true;
  return req.url === "about:blank" || isEmbedOriginUrl(req.url);
}

/** WebViewへ渡す外部URLを、YouTubeアプリかブラウザで開く */
export function openExternally(url: string): void {
  Linking.openURL(url).catch((error: unknown) => {
    console.warn("[player] 外部でURLを開けません", url, error);
  });
}

/**
 * onShouldStartLoadWithRequest用。許可しない遷移はWebView内で読み込まず外部で開く
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
