/**
 * AsyncStorageを使用したローカルストレージサービス
 * 練習セッション・お気に入り・最近視聴した動画・練習フレーズ・練習結果の永続化を担当する
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import type {
  PracticeSession,
  FavoriteVideo,
  RecentVideo,
  PracticePhrase,
  PhraseAttempt,
} from "@/shared/types/models";
import { practiceSessionSchema } from "@/shared/lib/schemas/practiceSession";
import { favoriteVideoSchema } from "@/shared/lib/schemas/favoriteVideo";
import { recentVideoSchema } from "@/shared/lib/schemas/recentVideo";
import { practicePhraseSchema } from "@/shared/lib/schemas/practicePhrase";
import { phraseAttemptSchema } from "@/shared/lib/schemas/phraseAttempt";
import {
  DEFAULT_REMINDER_SETTINGS,
  reminderSettingsSchema,
  type ReminderSettings,
} from "@/shared/lib/schemas/reminderSettings";
import { clampBpm } from "@/shared/constants/bpm";
import { PLAYBACK_RATES } from "@/shared/constants/playback";

/** ストレージキーの定義 */
export const STORAGE_KEYS = {
  PRACTICE_SESSIONS: "@guitar_lovers/practice_sessions",
  FAVORITE_VIDEOS: "@guitar_lovers/favorite_videos",
  RECENT_VIDEOS: "@guitar_lovers/recent_videos",
  PRACTICE_PHRASES: "@guitar_lovers/practice_phrases",
  PHRASE_ATTEMPTS: "@guitar_lovers/phrase_attempts",
  REMINDER_SETTINGS: "@guitar_lovers/reminder_settings",
  SCHEMA_VERSION: "@guitar_lovers/schema_version",
} as const;

/** 最近視聴した動画の最大保持数 */
const MAX_RECENT_VIDEOS = 10;

// ============================================================
// 共通ヘルパー
// ============================================================

/**
 * 指定キーのリストをAsyncStorageから読み込み、要素ごとにスキーマ検証する
 * 壊れた要素は退避キーへ移してから残りを返す。JSON自体が破損している場合は
 * 元データを退避キーへ移してから空配列を返す（上書き消失防止）
 * @param key - AsyncStorageのキー
 * @param itemSchema - 要素1件分のZodスキーマ
 */
async function readList<T>(
  key: string,
  itemSchema: z.ZodType<T>
): Promise<T[]> {
  let json: string | null;
  try {
    json = await AsyncStorage.getItem(key);
  } catch (e) {
    console.error(`[storage] ${key}の読み込みエラー`, e);
    return [];
  }
  if (!json) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    console.error(`[storage] ${key}のJSON解析に失敗、破損データを退避します`, e);
    await quarantine(key, `${key}__corrupt_${Date.now()}`, json, null);
    return [];
  }

  if (!Array.isArray(raw)) {
    console.error(`[storage] ${key}の内容が配列ではありません、破損データを退避します`);
    await quarantine(key, `${key}__corrupt_${Date.now()}`, json, null);
    return [];
  }

  const result: T[] = [];
  const dropped: unknown[] = [];
  for (const item of raw) {
    const parsed = itemSchema.safeParse(item);
    if (parsed.success) {
      result.push(parsed.data);
    } else {
      dropped.push(item);
    }
  }
  if (dropped.length > 0) {
    console.warn(`[storage] ${key}で壊れた要素を${dropped.length}件除外し退避します`);
    await quarantine(
      key,
      `${key}__dropped_${Date.now()}`,
      JSON.stringify(dropped),
      JSON.stringify(result)
    );
  }
  return result;
}

/**
 * 破損データを退避キーへ保存し、元キーを正常分だけに置き換える
 * 元キーに破損分を残すと読み出しのたびに退避キーが増えるため、退避は1回で完結させる
 */
async function quarantine(
  key: string,
  backupKey: string,
  backupJson: string,
  remainingJson: string | null
): Promise<void> {
  await AsyncStorage.setItem(backupKey, backupJson);
  if (remainingJson === null) {
    await AsyncStorage.removeItem(key);
  } else {
    await AsyncStorage.setItem(key, remainingJson);
  }
}

let writeQueue: Promise<unknown> = Promise.resolve();

/** 操作を単一キューの末尾に積む（相互排他のみ。移行の完了確認は行わない） */
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(operation, operation);
  writeQueue = run.catch(() => undefined);
  return run;
}

/**
 * 全件読み→加工→全件書きの更新を直列化する
 * 同一キーへの並行更新が後勝ちで互いの変更を消さないよう、読み書きはすべてこれを通す。
 * 移行が未完了なら先に実行し、移行に失敗した場合は操作自体を失敗させる
 * （未移行データを新スキーマで読んで退避・除去してしまわないため）
 */
function serialized<T>(operation: () => Promise<T>): Promise<T> {
  return enqueue(async () => {
    await ensureMigratedUnlocked();
    return operation();
  });
}

async function writeList(key: string, list: unknown[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

/**
 * 指定キーの単一オブジェクトをAsyncStorageから読み込み、スキーマ検証する
 * キーが無ければfallbackを返す。JSONの破損やスキーマ不一致は退避キーへ移してからfallbackを返す
 * @param key - AsyncStorageのキー
 * @param schema - オブジェクトのZodスキーマ
 * @param fallback - 読めなかったときに返す値
 */
async function readObject<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T
): Promise<T> {
  let json: string | null;
  try {
    json = await AsyncStorage.getItem(key);
  } catch (e) {
    console.error(`[storage] ${key}の読み込みエラー`, e);
    return fallback;
  }
  if (!json) return fallback;

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    console.error(`[storage] ${key}のJSON解析に失敗、破損データを退避します`, e);
    await quarantine(key, `${key}__corrupt_${Date.now()}`, json, null);
    return fallback;
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.error(`[storage] ${key}の内容がスキーマに合いません、破損データを退避します`);
    await quarantine(key, `${key}__corrupt_${Date.now()}`, json, null);
    return fallback;
  }
  return parsed.data;
}

async function writeObject(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ============================================================
// スキーマバージョン管理
// ============================================================

/**
 * 現在のストレージスキーマバージョン
 * 2: BPMを40〜240の整数、区間をstartSec < endSec、再生速度を選択肢の値、日時をISO 8601に限定した
 */
const SCHEMA_VERSION = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeBpm(value: unknown): unknown {
  return typeof value === "number" && Number.isFinite(value)
    ? clampBpm(Math.round(value))
    : value;
}

function normalizePlaybackRate(value: unknown): unknown {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  return PLAYBACK_RATES.reduce((nearest, rate) =>
    Math.abs(rate - value) < Math.abs(nearest - value) ? rate : nearest
  );
}

/** 解釈できる日時文字列をUTCのISO 8601へ揃える（解釈できなければそのまま返す） */
function normalizeDateTime(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const time = Date.parse(value);
  return Number.isNaN(time) ? value : new Date(time).toISOString();
}

/** キーの生JSON配列を要素ごとに変換して書き戻す（スキーマ検証前の移行用） */
async function rewriteRawList(
  key: string,
  mapItem: (item: unknown) => unknown
): Promise<void> {
  const json = await AsyncStorage.getItem(key);
  if (!json) return;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return;
  }
  if (!Array.isArray(raw)) return;
  await writeList(key, raw.map(mapItem));
}

/** バージョン2への移行: 旧ビルドが検証せずに保存したBPMと区間を新スキーマに収まる値へ補正する */
async function migrateToV2(): Promise<void> {
  await rewriteRawList(STORAGE_KEYS.PRACTICE_PHRASES, (item) => {
    if (!isRecord(item)) return item;
    const { startSec, endSec } = item;
    const needsEndFix =
      typeof startSec === "number" &&
      typeof endSec === "number" &&
      endSec <= startSec;
    return {
      ...item,
      currentBpm: normalizeBpm(item.currentBpm),
      targetBpm: normalizeBpm(item.targetBpm),
      endSec: needsEndFix ? startSec + 1 : endSec,
      playbackRate: normalizePlaybackRate(item.playbackRate),
      createdAt: normalizeDateTime(item.createdAt),
      updatedAt: normalizeDateTime(item.updatedAt),
      ...(item.archivedAt !== undefined
        ? { archivedAt: normalizeDateTime(item.archivedAt) }
        : {}),
    };
  });
  await rewriteRawList(STORAGE_KEYS.PHRASE_ATTEMPTS, (item) =>
    isRecord(item)
      ? { ...item, bpm: normalizeBpm(item.bpm), date: normalizeDateTime(item.date) }
      : item
  );
}

/** スキーマバージョンを確認し、古ければ移行してバージョンを書く。失敗時は例外を伝播する */
async function ensureMigratedUnlocked(): Promise<void> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION);
  const version = stored ? Number(stored) : 0;
  if (version >= SCHEMA_VERSION) return;

  if (version < 2) {
    await migrateToV2();
  }
  await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, String(SCHEMA_VERSION));
}

/**
 * ストレージのスキーマバージョンを確認し、必要なら移行処理を行う
 * 読み書きの各操作が実行前に自動で行うため、通常は明示的に呼ぶ必要はない。
 * 失敗してもアプリの起動は妨げない（その場合、以降の読み書きが失敗して再試行を促す）
 */
export function migrateIfNeeded(): Promise<void> {
  return enqueue(async () => {
    try {
      await ensureMigratedUnlocked();
    } catch (e) {
      console.error("[storage] migrateIfNeededに失敗", e);
    }
  });
}

/** 記録対象のフレーズが存在しない（削除済み）ときの例外 */
export class PhraseNotFoundError extends Error {
  constructor() {
    super("記録対象のフレーズが見つかりません");
    this.name = "PhraseNotFoundError";
  }
}

// ============================================================
// リマインド設定
// ============================================================

function loadReminderSettings(): Promise<ReminderSettings> {
  return readObject(
    STORAGE_KEYS.REMINDER_SETTINGS,
    reminderSettingsSchema,
    DEFAULT_REMINDER_SETTINGS
  );
}

/**
 * リマインド設定を取得する。未保存なら既定値を返す
 */
export function getReminderSettings(): Promise<ReminderSettings> {
  return serialized(loadReminderSettings);
}

/**
 * リマインド設定の一部を更新し、更新後の設定を返す
 * @param patch - 更新するフィールドの差分
 */
export function updateReminderSettings(
  patch: Partial<ReminderSettings>
): Promise<ReminderSettings> {
  return serialized(async () => {
    const next = { ...(await loadReminderSettings()), ...patch };
    await writeObject(STORAGE_KEYS.REMINDER_SETTINGS, next);
    return next;
  });
}

// ============================================================
// 練習セッション
// ============================================================

/**
 * 全練習セッションを取得する
 */
function loadPracticeSessions(): Promise<PracticeSession[]> {
  return readList(STORAGE_KEYS.PRACTICE_SESSIONS, practiceSessionSchema);
}

export function getPracticeSessions(): Promise<PracticeSession[]> {
  return serialized(loadPracticeSessions);
}

/**
 * 練習セッションを保存する
 * @param session - 保存するセッション
 */
export function savePracticeSession(session: PracticeSession): Promise<void> {
  return serialized(async () => {
    const sessions = await loadPracticeSessions();
    sessions.unshift(session);
    await writeList(STORAGE_KEYS.PRACTICE_SESSIONS, sessions);
  });
}

/**
 * 指定IDの練習セッションを削除する
 * @param id - 削除するセッションのID
 */
export function deletePracticeSession(id: string): Promise<void> {
  return serialized(async () => {
    const sessions = await loadPracticeSessions();
    await writeList(
      STORAGE_KEYS.PRACTICE_SESSIONS,
      sessions.filter((s) => s.id !== id)
    );
  });
}

// ============================================================
// お気に入り動画
// ============================================================

/**
 * 全お気に入り動画を取得する
 */
function loadFavoriteVideos(): Promise<FavoriteVideo[]> {
  return readList(STORAGE_KEYS.FAVORITE_VIDEOS, favoriteVideoSchema);
}

export function getFavoriteVideos(): Promise<FavoriteVideo[]> {
  return serialized(loadFavoriteVideos);
}

/**
 * お気に入り動画を追加する
 * @param video - 追加する動画
 */
export function addFavoriteVideo(video: FavoriteVideo): Promise<void> {
  return serialized(async () => {
    const favorites = await loadFavoriteVideos();
    if (favorites.some((f) => f.videoId === video.videoId)) return;
    favorites.unshift(video);
    await writeList(STORAGE_KEYS.FAVORITE_VIDEOS, favorites);
  });
}

/**
 * お気に入り動画を削除する
 * @param videoId - 削除する動画のID
 */
export function removeFavoriteVideo(videoId: string): Promise<void> {
  return serialized(async () => {
    const favorites = await loadFavoriteVideos();
    await writeList(
      STORAGE_KEYS.FAVORITE_VIDEOS,
      favorites.filter((f) => f.videoId !== videoId)
    );
  });
}

// ============================================================
// 最近視聴した動画
// ============================================================

/**
 * 最近視聴した動画一覧を取得する
 */
function loadRecentVideos(): Promise<RecentVideo[]> {
  return readList(STORAGE_KEYS.RECENT_VIDEOS, recentVideoSchema);
}

export function getRecentVideos(): Promise<RecentVideo[]> {
  return serialized(loadRecentVideos);
}

/**
 * 最近視聴した動画を記録する
 * 同じ動画が既にある場合は先頭に移動する
 * @param video - 記録する動画
 */
export function addRecentVideo(video: RecentVideo): Promise<void> {
  return serialized(async () => {
    const recents = await loadRecentVideos();
    const filtered = recents.filter((r) => r.videoId !== video.videoId);
    filtered.unshift(video);
    await writeList(
      STORAGE_KEYS.RECENT_VIDEOS,
      filtered.slice(0, MAX_RECENT_VIDEOS)
    );
  });
}

// ============================================================
// 練習フレーズ
// ============================================================

/**
 * 全練習フレーズを取得する
 */
function loadPracticePhrases(): Promise<PracticePhrase[]> {
  return readList(STORAGE_KEYS.PRACTICE_PHRASES, practicePhraseSchema);
}

export function getPracticePhrases(): Promise<PracticePhrase[]> {
  return serialized(loadPracticePhrases);
}

async function updatePracticePhraseUnlocked(
  id: string,
  patch: Partial<Omit<PracticePhrase, "id">>
): Promise<void> {
  const phrases = await loadPracticePhrases();
  await writeList(
    STORAGE_KEYS.PRACTICE_PHRASES,
    phrases.map((p) => (p.id === id ? { ...p, ...patch } : p))
  );
}

/**
 * 練習フレーズを保存する
 * @param phrase - 保存するフレーズ
 */
export function savePracticePhrase(phrase: PracticePhrase): Promise<void> {
  return serialized(async () => {
    const phrases = await loadPracticePhrases();
    phrases.unshift(phrase);
    await writeList(STORAGE_KEYS.PRACTICE_PHRASES, phrases);
  });
}

/**
 * 練習フレーズを更新する
 * @param id - 更新するフレーズのID
 * @param patch - 更新するフィールドの差分
 */
export function updatePracticePhrase(
  id: string,
  patch: Partial<Omit<PracticePhrase, "id">>
): Promise<void> {
  return serialized(() => updatePracticePhraseUnlocked(id, patch));
}

/**
 * 練習フレーズをアーカイブする（今日の練習メニューと進捗一覧に表示しない。記録は保持する）
 * @param id - アーカイブするフレーズのID
 */
export function archivePracticePhrase(id: string): Promise<void> {
  return updatePracticePhrase(id, { archivedAt: new Date().toISOString() });
}

/**
 * 指定IDの練習フレーズを削除する。関連するフレーズ練習結果も併せて削除する
 * 結果を先に消すため、途中で失敗してもフレーズは一覧に残り再実行で完了できる
 * @param id - 削除するフレーズのID
 */
export function deletePracticePhrase(id: string): Promise<void> {
  return serialized(async () => {
    const attempts = await loadPhraseAttempts();
    const remainingAttempts = attempts.filter((a) => a.phraseId !== id);
    if (remainingAttempts.length !== attempts.length) {
      await writeList(STORAGE_KEYS.PHRASE_ATTEMPTS, remainingAttempts);
    }

    const phrases = await loadPracticePhrases();
    await writeList(
      STORAGE_KEYS.PRACTICE_PHRASES,
      phrases.filter((p) => p.id !== id)
    );
  });
}

// ============================================================
// フレーズ練習結果
// ============================================================

/**
 * 全フレーズ練習結果を取得する
 */
function loadPhraseAttempts(): Promise<PhraseAttempt[]> {
  return readList(STORAGE_KEYS.PHRASE_ATTEMPTS, phraseAttemptSchema);
}

export function getPhraseAttempts(): Promise<PhraseAttempt[]> {
  return serialized(loadPhraseAttempts);
}

async function savePhraseAttemptUnlocked(attempt: PhraseAttempt): Promise<void> {
  const attempts = await loadPhraseAttempts();
  const others = attempts.filter((a) => a.id !== attempt.id);
  others.unshift(attempt);
  await writeList(STORAGE_KEYS.PHRASE_ATTEMPTS, others);
}

/**
 * フレーズ練習結果を保存する。同じIDが既にあれば置き換える（再送しても重複しない）
 * @param attempt - 保存する練習結果
 */
export function savePhraseAttempt(attempt: PhraseAttempt): Promise<void> {
  return serialized(() => savePhraseAttemptUnlocked(attempt));
}

/**
 * フレーズ練習の結果を記録し、弾けた場合はフレーズの到達BPMを引き上げる
 * 対象フレーズが無ければ例外にする（削除済みフレーズへの孤児記録を防ぐ）。
 * attemptのIDをキーにした置き換え保存なので、途中で失敗しても再実行できる。
 * 結果を先に保存するため、途中失敗で残るのは「記録はあるが到達BPM未更新」の状態だけで、
 * 読み出し側はresolveCurrentBpmで記録から到達BPMを補って整合させる
 * @param attempt - 記録する練習結果
 */
export function recordPhraseResult(attempt: PhraseAttempt): Promise<void> {
  return serialized(async () => {
    const phrases = await loadPracticePhrases();
    const phrase = phrases.find((p) => p.id === attempt.phraseId);
    if (!phrase) {
      throw new PhraseNotFoundError();
    }

    await savePhraseAttemptUnlocked(attempt);
    if (attempt.result === "ok" && phrase.currentBpm < attempt.bpm) {
      await updatePracticePhraseUnlocked(phrase.id, {
        currentBpm: attempt.bpm,
        updatedAt: attempt.date,
      });
    }
  });
}
