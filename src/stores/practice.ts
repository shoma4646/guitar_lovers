/**
 * 練習画面のグローバル状態管理ストア
 * Zustandを使用してYouTube動画・メトロノーム・ABループの状態を管理する
 */

import { create } from "zustand";
import type { ABLoop, Bookmark } from "@/shared/types/models";

/** 再生速度の選択肢 */
export const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

/** プリセットBPMの選択肢 */
export const PRESET_BPMS = [60, 80, 100, 120, 140, 160] as const;

/** 練習ストアの状態 */
interface PracticeState {
  // --- YouTube動画 ---
  /** 入力中のURL */
  urlInput: string;
  /** 読み込み済みのYouTube動画ID */
  loadedVideoId: string | null;
  /** 動画タイトル */
  videoTitle: string;
  /** 再生中かどうか */
  isPlaying: boolean;
  /** 現在の再生位置（秒） */
  currentTime: number;
  /** 動画の総時間（秒） */
  duration: number;
  /** 再生速度 */
  playbackRate: PlaybackRate;

  // --- 練習時間 ---
  /** 練習タイマー開始時刻 */
  practiceStartTime: number | null;
  /** 経過練習時間（秒） */
  elapsedSeconds: number;

  // --- ABループ ---
  abLoop: ABLoop;

  // --- ブックマーク ---
  bookmarks: Bookmark[];

  // --- メトロノーム ---
  metronomeBpm: number;
  metronomeEnabled: boolean;

  // --- アクション ---
  setUrlInput: (url: string) => void;
  loadVideo: (videoId: string, title?: string) => void;
  clearVideo: () => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaybackRate: (rate: PlaybackRate) => void;
  startPracticeTimer: () => void;
  stopPracticeTimer: () => void;
  resetPracticeTimer: () => void;
  updateElapsedSeconds: () => void;
  setABLoop: (loop: Partial<ABLoop>) => void;
  clearABLoop: () => void;
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (id: string) => void;
  setMetronomeBpm: (bpm: number) => void;
  setMetronomeEnabled: (enabled: boolean) => void;
  /**
   * 現在の累計練習時間を分単位で返す
   * タイマー計測中の場合は経過時間も含めて計算する
   */
  getPracticeMinutes: () => number;
}

/** URLからYouTube動画IDを抽出する */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * 練習画面グローバルストア
 */
export const usePracticeStore = create<PracticeState>((set, get) => ({
  // 初期状態
  urlInput: "",
  loadedVideoId: null,
  videoTitle: "",
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  practiceStartTime: null,
  elapsedSeconds: 0,
  abLoop: { pointA: null, pointB: null, enabled: false },
  bookmarks: [],
  metronomeBpm: 120,
  metronomeEnabled: false,

  // アクション実装
  setUrlInput: (url) => set({ urlInput: url }),

  loadVideo: (videoId, title = "") => {
    // URLとして入力された場合はIDを抽出する
    const id = extractVideoId(videoId) ?? videoId;
    set({
      loadedVideoId: id,
      videoTitle: title,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      abLoop: { pointA: null, pointB: null, enabled: false },
      bookmarks: [],
    });
  },

  clearVideo: () =>
    set({
      loadedVideoId: null,
      videoTitle: "",
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      urlInput: "",
    }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),

  startPracticeTimer: () =>
    set({ practiceStartTime: Date.now() }),

  stopPracticeTimer: () => {
    const { practiceStartTime, elapsedSeconds } = get();
    if (practiceStartTime) {
      const additional = Math.floor((Date.now() - practiceStartTime) / 1000);
      set({ practiceStartTime: null, elapsedSeconds: elapsedSeconds + additional });
    }
  },

  resetPracticeTimer: () =>
    set({ practiceStartTime: null, elapsedSeconds: 0 }),

  updateElapsedSeconds: () => {
    const { practiceStartTime, elapsedSeconds } = get();
    if (practiceStartTime) {
      const additional = Math.floor((Date.now() - practiceStartTime) / 1000);
      set({ elapsedSeconds: elapsedSeconds + additional, practiceStartTime: Date.now() });
    }
  },

  setABLoop: (loop) =>
    set((state) => ({ abLoop: { ...state.abLoop, ...loop } })),

  clearABLoop: () =>
    set({ abLoop: { pointA: null, pointB: null, enabled: false } }),

  addBookmark: (bookmark) =>
    set((state) => ({
      bookmarks: [...state.bookmarks, bookmark].sort((a, b) => a.time - b.time),
    })),

  removeBookmark: (id) =>
    set((state) => ({
      bookmarks: state.bookmarks.filter((b) => b.id !== id),
    })),

  setMetronomeBpm: (bpm) => set({ metronomeBpm: Math.max(40, Math.min(240, bpm)) }),
  setMetronomeEnabled: (enabled) => set({ metronomeEnabled: enabled }),

  getPracticeMinutes: () => {
    const { practiceStartTime, elapsedSeconds } = get();
    const currentElapsed =
      practiceStartTime !== null
        ? Math.floor((Date.now() - practiceStartTime) / 1000)
        : 0;
    return Math.floor((elapsedSeconds + currentElapsed) / 60);
  },
}));

/** URLからYouTube動画IDを抽出するユーティリティ（外部公開） */
export { extractVideoId };
