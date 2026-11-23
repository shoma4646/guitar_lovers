/**
 * ギターチューニング関連の定数定義
 * 各チューニングプリセット・弦のノート名・判定閾値を管理する
 */

/** チューニングプリセットの種類の一覧 */
export const TUNING_PRESET_KEYS = ["standard", "halfStepDown", "dropD"] as const;

/** チューニングプリセットの種類 */
export type TuningPresetKey = (typeof TUNING_PRESET_KEYS)[number];

/** チューニングプリセット定義 */
export interface TuningPreset {
  /** 表示名 */
  label: string;
  /** 各弦のノート名（6弦から1弦の順） */
  notes: string[];
}

/**
 * チューニングプリセット一覧
 * 配列のインデックスは弦番号に対応（0=6弦, 5=1弦）
 */
export const tuningPresets: Record<TuningPresetKey, TuningPreset> = {
  standard: {
    label: "スタンダード",
    notes: ["E2", "A2", "D3", "G3", "B3", "E4"],
  },
  halfStepDown: {
    label: "半音下げ",
    notes: ["Eb2", "Ab2", "Db3", "Gb3", "Bb3", "Eb4"],
  },
  dropD: {
    label: "ドロップD",
    notes: ["D2", "A2", "D3", "G3", "B3", "E4"],
  },
};

/**
 * チューニング判定の許容範囲（セント単位）
 * この範囲内であれば「チューニング済み」とみなす
 */
export const TUNING_THRESHOLD_CENTS = 5;

/**
 * ピッチクラス名の一覧（C始まり、シャープ表記）
 */
export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
];
