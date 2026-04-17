/**
 * アプリ全体で使用するデータモデルの型定義
 */

/** 練習セッションの記録 */
export interface PracticeSession {
  /** 一意のID */
  id: string;
  /** 練習日時（ISO 8601形式） */
  date: string;
  /** 練習時間（秒） */
  duration: number;
  /** YouTube動画のURL（任意） */
  videoUrl?: string;
  /** YouTube動画ID（任意） */
  videoId?: string;
  /** 動画タイトル（任意） */
  videoTitle?: string;
  /** メモ（任意） */
  notes?: string;
}

/** ブックマーク（動画の特定時間） */
export interface Bookmark {
  /** 一意のID */
  id: string;
  /** ブックマーク時間（秒） */
  time: number;
  /** ラベル（任意） */
  label?: string;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
}

/** ABループの設定 */
export interface ABLoop {
  /** A点（秒）。null の場合は未設定 */
  pointA: number | null;
  /** B点（秒）。null の場合は未設定 */
  pointB: number | null;
  /** ループが有効かどうか */
  enabled: boolean;
}

/** 動画プリセット */
export interface VideoPreset {
  /** 一意のID */
  id: string;
  /** YouTube動画ID */
  videoId: string;
  /** 動画タイトル */
  title: string;
  /** カテゴリ */
  category: string;
  /** サムネイルURL（任意） */
  thumbnail?: string;
}

/** お気に入り動画 */
export interface FavoriteVideo {
  /** 一意のID */
  id: string;
  /** YouTube動画ID */
  videoId: string;
  /** 動画タイトル */
  title: string;
  /** 追加日時（ISO 8601形式） */
  addedAt: string;
}

/** 最近視聴した動画 */
export interface RecentVideo {
  /** YouTube動画ID */
  videoId: string;
  /** 動画タイトル */
  title: string;
  /** 最終視聴日時（ISO 8601形式） */
  lastWatchedAt: string;
}

/** ニュース記事 */
export interface NewsArticle {
  /** 一意のID */
  id: string;
  /** タイトル */
  title: string;
  /** 抜粋 */
  excerpt: string;
  /** サムネイル画像URL */
  image: string;
  /** 公開日（YYYY-MM-DD形式） */
  date: string;
  /** カテゴリ */
  category: string;
  /** 本文URL（任意） */
  url?: string;
}

/** 練習統計 */
export interface PracticeStats {
  /** 今週の練習時間（秒） */
  weeklyDuration: number;
  /** 連続練習日数 */
  streakDays: number;
  /** 累計練習時間（秒） */
  totalDuration: number;
  /** 総練習回数 */
  totalSessions: number;
  /** 曜日別練習時間（日〜土、秒） */
  weeklyData: number[];
}

/** メトロノームの設定 */
export interface MetronomeConfig {
  /** BPM */
  bpm: number;
  /** 有効かどうか */
  enabled: boolean;
}

/** チューナーの状態 */
export interface TunerState {
  /** 検出中かどうか */
  isActive: boolean;
  /** 現在のノート名 */
  currentNote: string | null;
  /** セント値（-50〜+50） */
  cents: number;
  /** 現在フォーカスしている弦のインデックス（0=6弦） */
  focusedString: number;
  /** 各弦のチューニング完了状態 */
  tunedStrings: boolean[];
}
