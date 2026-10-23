/**
 * アプリ全体で使用するデータモデルの型定義
 */

import type { z } from "zod";
import type { practiceSessionSchema } from "@/shared/lib/schemas/practiceSession";
import type { practicePhraseSchema } from "@/shared/lib/schemas/practicePhrase";
import type { phraseAttemptSchema } from "@/shared/lib/schemas/phraseAttempt";

/** 練習セッションの記録 */
export type PracticeSession = z.infer<typeof practiceSessionSchema>;

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
export type PracticePhrase = z.infer<typeof practicePhraseSchema>;

/** フレーズ1回分の練習結果 */
export type PhraseAttempt = z.infer<typeof phraseAttemptSchema>;

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
