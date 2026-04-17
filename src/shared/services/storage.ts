/**
 * AsyncStorageを使用したローカルストレージサービス
 * 練習セッション・お気に入り・最近視聴した動画の永続化を担当する
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  PracticeSession,
  FavoriteVideo,
  RecentVideo,
  PracticeStats,
} from "@/shared/types/models";

/** ストレージキーの定義 */
const STORAGE_KEYS = {
  PRACTICE_SESSIONS: "@guitar_lovers/practice_sessions",
  FAVORITE_VIDEOS: "@guitar_lovers/favorite_videos",
  RECENT_VIDEOS: "@guitar_lovers/recent_videos",
} as const;

/** 最近視聴した動画の最大保持数 */
const MAX_RECENT_VIDEOS = 10;

// ============================================================
// 練習セッション
// ============================================================

/**
 * 全練習セッションを取得する
 */
export async function getPracticeSessions(): Promise<PracticeSession[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.PRACTICE_SESSIONS);
    if (!json) return [];
    return JSON.parse(json) as PracticeSession[];
  } catch {
    return [];
  }
}

/**
 * 練習セッションを保存する
 * @param session - 保存するセッション
 */
export async function savePracticeSession(
  session: PracticeSession
): Promise<void> {
  const sessions = await getPracticeSessions();
  sessions.unshift(session);
  await AsyncStorage.setItem(
    STORAGE_KEYS.PRACTICE_SESSIONS,
    JSON.stringify(sessions)
  );
}

/**
 * 指定IDの練習セッションを削除する
 * @param id - 削除するセッションのID
 */
export async function deletePracticeSession(id: string): Promise<void> {
  const sessions = await getPracticeSessions();
  const updated = sessions.filter((s) => s.id !== id);
  await AsyncStorage.setItem(
    STORAGE_KEYS.PRACTICE_SESSIONS,
    JSON.stringify(updated)
  );
}

// ============================================================
// お気に入り動画
// ============================================================

/**
 * 全お気に入り動画を取得する
 */
export async function getFavoriteVideos(): Promise<FavoriteVideo[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_VIDEOS);
    if (!json) return [];
    return JSON.parse(json) as FavoriteVideo[];
  } catch {
    return [];
  }
}

/**
 * お気に入り動画を追加する
 * @param video - 追加する動画
 */
export async function addFavoriteVideo(video: FavoriteVideo): Promise<void> {
  const favorites = await getFavoriteVideos();
  const exists = favorites.some((f) => f.videoId === video.videoId);
  if (exists) return;
  favorites.unshift(video);
  await AsyncStorage.setItem(
    STORAGE_KEYS.FAVORITE_VIDEOS,
    JSON.stringify(favorites)
  );
}

/**
 * お気に入り動画を削除する
 * @param videoId - 削除する動画のID
 */
export async function removeFavoriteVideo(videoId: string): Promise<void> {
  const favorites = await getFavoriteVideos();
  const updated = favorites.filter((f) => f.videoId !== videoId);
  await AsyncStorage.setItem(
    STORAGE_KEYS.FAVORITE_VIDEOS,
    JSON.stringify(updated)
  );
}

/**
 * 指定動画がお気に入り済みかを確認する
 * @param videoId - 確認する動画のID
 */
export async function isFavoriteVideo(videoId: string): Promise<boolean> {
  const favorites = await getFavoriteVideos();
  return favorites.some((f) => f.videoId === videoId);
}

// ============================================================
// 最近視聴した動画
// ============================================================

/**
 * 最近視聴した動画一覧を取得する
 */
export async function getRecentVideos(): Promise<RecentVideo[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_VIDEOS);
    if (!json) return [];
    return JSON.parse(json) as RecentVideo[];
  } catch {
    return [];
  }
}

/**
 * 最近視聴した動画を記録する
 * 同じ動画が既にある場合は先頭に移動する
 * @param video - 記録する動画
 */
export async function addRecentVideo(video: RecentVideo): Promise<void> {
  const recents = await getRecentVideos();
  const filtered = recents.filter((r) => r.videoId !== video.videoId);
  filtered.unshift(video);
  const trimmed = filtered.slice(0, MAX_RECENT_VIDEOS);
  await AsyncStorage.setItem(
    STORAGE_KEYS.RECENT_VIDEOS,
    JSON.stringify(trimmed)
  );
}

// ============================================================
// 練習統計
// ============================================================

/**
 * 指定した日付が属する月曜日始まり週の月曜日の日付を返す
 * @param date - 対象日付
 */
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  // getDay()は0=日, 1=月 ... 6=土。月曜起算に変換する。
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 日付文字列をDateオブジェクトに変換する
 * @param isoString - ISO 8601形式の日付文字列
 */
function parseDate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * 2つの日付が同じ日かどうかを判定する（ローカル時間基準）
 * @param a - 比較する日付A
 * @param b - 比較する日付B
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * 練習統計を計算する
 * Flutterの実装と同様のロジックでストリーク・週次・累計を集計する
 */
export async function calculateStats(): Promise<PracticeStats> {
  const sessions = await getPracticeSessions();

  if (sessions.length === 0) {
    return {
      weeklyDuration: 0,
      streakDays: 0,
      totalDuration: 0,
      totalSessions: 0,
      weeklyData: [0, 0, 0, 0, 0, 0, 0],
    };
  }

  const now = new Date();
  const thisMonday = getMondayOfWeek(now);
  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);

  // 累計
  const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalSessions = sessions.length;

  // 今週の合計（月〜日）
  const weeklyDuration = sessions
    .filter((s) => {
      const d = parseDate(s.date);
      return d >= thisMonday && d < nextMonday;
    })
    .reduce((sum, s) => sum + s.duration, 0);

  // 曜日別集計（月=0, 火=1, ... 日=6）
  const weeklyData = [0, 0, 0, 0, 0, 0, 0];
  sessions.forEach((s) => {
    const d = parseDate(s.date);
    if (d >= thisMonday && d < nextMonday) {
      // getDay(): 0=日, 1=月 ... 6=土 → 月曜起算インデックスに変換
      const jsDay = d.getDay();
      const idx = jsDay === 0 ? 6 : jsDay - 1;
      weeklyData[idx] += s.duration;
    }
  });

  // 連続練習日数の計算
  // セッションを日付降順にソートして重複日をユニーク化する
  const sortedDates = sessions
    .map((s) => parseDate(s.date))
    .sort((a, b) => b.getTime() - a.getTime());

  const uniqueDays: Date[] = [];
  for (const d of sortedDates) {
    if (uniqueDays.length === 0 || !isSameDay(uniqueDays[uniqueDays.length - 1], d)) {
      uniqueDays.push(d);
    }
  }

  let streakDays = 0;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < uniqueDays.length; i++) {
    const dayStart = new Date(uniqueDays[i]);
    dayStart.setHours(0, 0, 0, 0);
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);

    if (isSameDay(dayStart, expected)) {
      streakDays++;
    } else {
      break;
    }
  }

  return {
    weeklyDuration,
    streakDays,
    totalDuration,
    totalSessions,
    weeklyData,
  };
}

/**
 * 指定した週の曜日別練習時間（秒）を取得する
 * @param weeksAgo - 何週間前か（0=今週, 1=先週）
 * @returns 月〜日の練習時間配列（インデックス0=月曜）
 */
export async function getWeeklyData(weeksAgo = 0): Promise<number[]> {
  const sessions = await getPracticeSessions();
  const now = new Date();
  const thisMonday = getMondayOfWeek(now);

  const targetMonday = new Date(thisMonday);
  targetMonday.setDate(thisMonday.getDate() - weeksAgo * 7);
  const targetNextMonday = new Date(targetMonday);
  targetNextMonday.setDate(targetMonday.getDate() + 7);

  const weeklyData = [0, 0, 0, 0, 0, 0, 0];
  sessions.forEach((s) => {
    const d = parseDate(s.date);
    if (d >= targetMonday && d < targetNextMonday) {
      const jsDay = d.getDay();
      const idx = jsDay === 0 ? 6 : jsDay - 1;
      weeklyData[idx] += s.duration;
    }
  });

  return weeklyData;
}
