/**
 * 練習画面のグローバル状態管理ストア
 * Zustandを使用してYouTube動画・メトロノーム・ABループの状態を管理する
 */

import { create } from "zustand";
import type { ABLoop, Bookmark, PracticePhrase } from "@/shared/types/models";
import { clampBpm } from "@/shared/constants/bpm";
import type { PlaybackRate } from "@/shared/constants/playback";

/** 練習タブ内のサブタブ */
export type PracticeSubTab = "practice" | "presets" | "favorites";

export { PLAYBACK_RATES, type PlaybackRate } from "@/shared/constants/playback";

/** プリセットBPMの選択肢 */
export const PRESET_BPMS = [60, 80, 100, 120, 140, 160] as const;

/** フレーズ練習の既定の目標回数 */
export const DEFAULT_TARGET_REPS = 3;

/** 今日の練習メニューから開始した練習中フレーズの状態 */
export type ActivePhrasePractice = {
  phrase: PracticePhrase;
  todayTargetBpm: number;
  /** 今日の目標BPMで弾く目標回数 */
  targetReps: number;
  /** 弾き終えた回数 */
  completedReps: number;
};

/** 練習ストアの状態 */
interface PracticeState {
  // --- YouTube動画 ---
  /** 入力中のURL */
  urlInput: string;
  /** 読み込み済みのYouTube動画ID */
  loadedVideoId: string | null;
  /** 動画タイトル */
  videoTitle: string;
  /** 現在の再生位置（秒） */
  currentTime: number;
  /** 動画の総時間（秒） */
  duration: number;
  /** 再生速度 */
  playbackRate: PlaybackRate;
  /**
   * 動画読み込み時の初期再生位置（秒）
   * loadVideo呼び出し時のみ更新する。setABLoopでのA点調整では変えない
   * （WebViewの再読み込みをフレーズ練習開始時のみに限定するため）
   */
  videoStartSeconds: number;
  /**
   * 動画読み込み時にWebView側へ焼き込む初期再生速度
   * loadVideo呼び出し時のみ更新する。setPlaybackRateでのライブ変更では変えない
   * （同上の理由でWebView再読み込みを避けるため）
   */
  videoInitialRate: PlaybackRate;
  /**
   * loadVideo呼び出しのたびにインクリメントされる値
   * WebViewのkeyに渡し、HTML文字列が同一でも強制再マウント（＝再読み込み）させるために使う
   */
  videoLoadNonce: number;

  // --- 練習サブタブ ---
  /** Practice画面のサブタブ選択状態。Presets/Favoritesからの再生後に「練習」へ戻すため画面遷移をまたいで保持する */
  practiceSubTab: PracticeSubTab;

  // --- 練習中のフレーズ ---
  /** 「今日の練習メニュー」から開始した練習中フレーズ。サブタブ切替で消えないようストアに保持する */
  activePhrasePractice: ActivePhrasePractice | null;
  /**
   * 結果記録中のattempt ID。保存失敗後の再送で同じIDを使い重複記録を防ぐため、
   * 練習中フレーズと同じ寿命でストアに保持する
   */
  pendingAttemptId: string | null;

  // --- 動画プレイヤーのエラー ---
  /** YouTubeプレイヤーのエラーコード（-1は読み込み失敗）。nullなら正常。動画を切り替えるまで保持する */
  playerError: number | null;

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
  /**
   * 動画を読み込む
   * @param options.abLoop - 指定するとABループを空リセットせずこの値で開始する
   *   （フレーズからの練習再開で、区間を保持したまま動画を切り替えるために使用）
   * @param options.playbackRate - 指定するとその速度をWebView初期化時に焼き込み、
   *   選択中の再生速度としても反映する（未指定時は現在の再生速度を維持）
   */
  loadVideo: (
    videoId: string,
    title?: string,
    options?: {
      abLoop?: ABLoop;
      playbackRate?: PlaybackRate;
      /**
       * 読み込み対象のフレーズID
       * 現在練習中のフレーズと同じIDならpendingAttemptId・練習中状態を維持する
       * （保存失敗後の再送で同じフレーズを開始し直しても、結果記録が重複しないため）
       */
      phraseId?: string;
    },
  ) => void;
  clearVideo: () => void;
  /**
   * 今日の練習メニューからフレーズ練習を開始する
   * 動画・区間・再生速度・メトロノームBPM・練習中フレーズを一貫して設定する唯一の入口
   */
  startPhrasePractice: (phrase: PracticePhrase, todayTargetBpm: number) => void;
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
  setPracticeSubTab: (tab: PracticeSubTab) => void;
  setActivePhrasePractice: (value: ActivePhrasePractice | null) => void;
  /** 練習中フレーズの弾き終えた回数を1増やし、増やした後の回数を返す（練習中でなければ何もせず0を返す） */
  incrementCompletedReps: () => number;
  /** 結果記録を開始し、未発番なら新しいattempt IDを発番して返す（再送時は同じIDを返す） */
  beginResultEntry: (newId: string) => string;
  setPlayerError: (code: number | null) => void;
  /**
   * 現在の累計練習時間を分単位で返す
   * タイマー計測中の場合は経過時間も含めて計算する
   */
  getPracticeMinutes: () => number;
}

/** URLからYouTube動画IDを抽出する */
function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?(?:[^#\s]*&)?v=([^&?/\s]{11})/,
    /(?:youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([^&?/\s]{11})/,
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
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  videoStartSeconds: 0,
  videoInitialRate: 1.0,
  videoLoadNonce: 0,
  practiceSubTab: "practice",
  activePhrasePractice: null,
  pendingAttemptId: null,
  playerError: null,
  practiceStartTime: null,
  elapsedSeconds: 0,
  abLoop: { pointA: null, pointB: null, enabled: false },
  bookmarks: [],
  metronomeBpm: 120,
  metronomeEnabled: false,

  // アクション実装
  setUrlInput: (url) => set({ urlInput: url }),

  loadVideo: (videoId, title = "", options) => {
    // URLとして入力された場合はIDを抽出する
    const id = extractVideoId(videoId) ?? videoId;
    // 速度未指定時は現在選択中の速度を維持する（WebView側にも改めて焼き込む）
    const nextPlaybackRate = options?.playbackRate ?? get().playbackRate;
    const current = get().activePhrasePractice;
    const samePhrase =
      options?.phraseId !== undefined && current?.phrase.id === options.phraseId;
    set((state) => ({
      loadedVideoId: id,
      videoTitle: title,
      currentTime: 0,
      duration: 0,
      videoStartSeconds: options?.abLoop?.pointA ?? 0,
      videoInitialRate: nextPlaybackRate,
      playbackRate: nextPlaybackRate,
      videoLoadNonce: state.videoLoadNonce + 1,
      abLoop: options?.abLoop ?? { pointA: null, pointB: null, enabled: false },
      bookmarks: [],
      // 別の動画・別のフレーズに切り替えたら、前のフレーズへ結果が記録されないよう練習中状態を解除する
      activePhrasePractice: samePhrase ? state.activePhrasePractice : null,
      pendingAttemptId: samePhrase ? state.pendingAttemptId : null,
      playerError: null,
    }));
  },

  startPhrasePractice: (phrase, todayTargetBpm) => {
    get().loadVideo(phrase.videoId, phrase.videoTitle, {
      abLoop: { pointA: phrase.startSec, pointB: phrase.endSec, enabled: true },
      playbackRate: phrase.playbackRate,
      phraseId: phrase.id,
    });
    set({
      activePhrasePractice: {
        phrase,
        todayTargetBpm,
        targetReps: DEFAULT_TARGET_REPS,
        completedReps: 0,
      },
      metronomeBpm: clampBpm(todayTargetBpm),
    });
  },

  clearVideo: () =>
    set({
      loadedVideoId: null,
      videoTitle: "",
      currentTime: 0,
      duration: 0,
      videoStartSeconds: 0,
      videoInitialRate: 1.0,
      playbackRate: 1.0,
      urlInput: "",
      abLoop: { pointA: null, pointB: null, enabled: false },
      bookmarks: [],
      activePhrasePractice: null,
      pendingAttemptId: null,
      playerError: null,
    }),

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

  setMetronomeBpm: (bpm) => set({ metronomeBpm: clampBpm(bpm) }),
  setMetronomeEnabled: (enabled) => set({ metronomeEnabled: enabled }),
  setPracticeSubTab: (tab) => set({ practiceSubTab: tab }),
  setActivePhrasePractice: (value) =>
    set({
      activePhrasePractice: value,
      pendingAttemptId: value === null ? null : get().pendingAttemptId,
    }),
  beginResultEntry: (newId) => {
    const current = get().pendingAttemptId;
    if (current) return current;
    set({ pendingAttemptId: newId });
    return newId;
  },
  incrementCompletedReps: () => {
    const active = get().activePhrasePractice;
    if (!active) return 0;
    const completedReps = active.completedReps + 1;
    set({ activePhrasePractice: { ...active, completedReps } });
    return completedReps;
  },
  setPlayerError: (code) => set({ playerError: code }),

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
