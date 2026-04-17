/**
 * ギターチューニング関連の定数定義
 * 各チューニングプリセット・弦のノート名・基準周波数を管理する
 */

/** チューニングプリセットの種類 */
export type TuningPresetKey = "standard" | "halfStepDown" | "dropD";

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
 * 各弦のノート名（スタンダードチューニング）
 * インデックス0が最低音弦（6弦）
 */
export const stringNotes: string[] = ["E2", "A2", "D3", "G3", "B3", "E4"];

/**
 * 各弦の基準周波数 Hz（スタンダードチューニング）
 * インデックス0が最低音弦（6弦）
 */
export const guitarStringFrequencies: number[] = [
  82.41,  // E2 (6弦)
  110.0,  // A2 (5弦)
  146.83, // D3 (4弦)
  196.0,  // G3 (3弦)
  246.94, // B3 (2弦)
  329.63, // E4 (1弦)
];

/**
 * チューニング判定の許容範囲（セント単位）
 * この範囲内であれば「チューニング済み」とみなす
 */
export const TUNING_THRESHOLD_CENTS = 5;

/**
 * セント値からノート名を取得するためのノートリスト
 */
export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
];
