/**
 * アプリ全体で使用するデータモデルの型定義
 */

import type { PlaybackRate } from "@/shared/constants/playback";

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

/** 練習フレーズ（動画内の反復練習区間） */
export interface PracticePhrase {
  /** 一意のID */
  id: string;
  /** YouTube動画ID */
  videoId: string;
  /** 動画タイトル */
  videoTitle: string;
  /** ユーザーが付ける名前（例: 速弾きフレーズ1） */
  name: string;
  /** 区間開始（秒） */
  startSec: number;
  /** 区間終了（秒） */
  endSec: number;
  /** 現在の到達BPM */
  currentBpm: number;
  /** 目標BPM */
  targetBpm: number;
  /** 区間再生時の再生速度 */
  playbackRate: PlaybackRate;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
  /** アーカイブ日時（ISO 8601形式、任意）。設定されていれば今日の練習メニューと進捗一覧に表示しない（記録は保持） */
  archivedAt?: string;
  /** 保存時のBPM（任意）。導入前に保存したフレーズには無い */
  initialBpm?: number;
  /** 目標BPMに到達した日時（ISO 8601形式、任意）。卒業かどうかは到達BPMと目標BPMから判定し、この値単独では判定しない */
  graduatedAt?: string;
}

/** フレーズ1回分の練習結果 */
export interface PhraseAttempt {
  /** 一意のID */
  id: string;
  /** 対象フレーズのID */
  phraseId: string;
  /** 練習日時（ISO 8601形式） */
  date: string;
  /** その回のBPM */
  bpm: number;
  /** 結果。ok=弾けた / partial=あやしい / ng=弾けなかった */
  result: "ok" | "partial" | "ng";
  /** その回に弾いた回数（任意） */
  reps?: number;
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

/** 練習統計 */
export interface PracticeStats {
  /** 今週の練習時間（秒） */
  weeklyDuration: number;
  /** 今週（月曜起点）に練習した日数。セッションまたはフレーズ練習結果がある日を数える */
  weeklyPracticeDays: number;
  /** 連続練習日数 */
  streakDays: number;
  /** 累計練習時間（秒） */
  totalDuration: number;
  /** 総練習回数 */
  totalSessions: number;
  /** 曜日別練習時間（月〜日、秒） */
  weeklyData: number[];
  /** 曜日別の練習有無（月〜日）。セッションまたはフレーズ練習結果があった日をtrueとする */
  weeklyPracticedDays: boolean[];
}

/** メトロノームの設定 */
export interface MetronomeConfig {
  /** BPM */
  bpm: number;
  /** 有効かどうか */
  enabled: boolean;
}
