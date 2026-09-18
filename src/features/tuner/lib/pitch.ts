/**
 * 周波数とノート名の相互変換（A4=440Hzの平均律）
 */

import { NOTE_NAMES } from "@/shared/constants/tuning";

const A4_FREQUENCY = 440;
const A4_MIDI = 69;

const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

/** ノート名（"E2"、"Eb2"、"F#3"形式）をMIDIノート番号に変換する */
export function noteToMidi(note: string): number {
  const match = /^([A-G])(#|b)?(-?\d+)$/.exec(note);
  if (!match) {
    throw new Error(`不正なノート名: ${note}`);
  }
  const [, letter, accidental, octaveText] = match;
  const pitchClass = accidental === "b" ? FLAT_TO_SHARP[`${letter}b`] : `${letter}${accidental ?? ""}`;
  const index = NOTE_NAMES.indexOf(pitchClass);
  if (index < 0) {
    throw new Error(`不正なノート名: ${note}`);
  }
  return (Number(octaveText) + 1) * 12 + index;
}

/** ノート名の基準周波数（Hz）を返す */
export function noteToFrequency(note: string): number {
  return A4_FREQUENCY * Math.pow(2, (noteToMidi(note) - A4_MIDI) / 12);
}

/** 2つの周波数の差をセント単位で返す（hzがtargetより高ければ正） */
export function centsBetween(hz: number, targetHz: number): number {
  return 1200 * Math.log2(hz / targetHz);
}

export interface DetectedNote {
  /** ピッチクラス名（"E"、"F#"など） */
  noteName: string;
  octave: number;
  midi: number;
  /** 最寄りノートからのずれ（-50〜+50セント） */
  cents: number;
}

/** 周波数を最寄りのノートとセント差に変換する */
export function frequencyToNote(hz: number): DetectedNote {
  const midiFloat = A4_MIDI + 12 * Math.log2(hz / A4_FREQUENCY);
  const midi = Math.round(midiFloat);
  return {
    noteName: NOTE_NAMES[((midi % 12) + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    midi,
    cents: (midiFloat - midi) * 100,
  };
}

/**
 * 最寄りの弦からこれ以上離れていたら「どの弦でもない」とみなすセント数。
 * 隣接弦の最小間隔400セントの半分。Drop D選択直後の6弦（D2から+200セント）を
 * 案内できるよう境界を含める。2倍音への飛びは平滑化側のオクターブ拒否で防ぐ
 */
export const MAX_STRING_DISTANCE_CENTS = 200;
// ちょうど境界に乗る値（他弦の2倍音や全音差）が浮動小数点誤差で割れないための余裕
const DISTANCE_EPSILON_CENTS = 1e-6;

/**
 * プリセットの弦の中で周波数に最も近い弦のインデックスとセント差を返す。
 * 最寄りの弦でもMAX_STRING_DISTANCE_CENTSを超えて離れている場合はnull（該当弦なし）
 */
export function nearestStringInPreset(
  hz: number,
  notes: string[],
): { index: number; cents: number } | null {
  let best = { index: 0, cents: Number.POSITIVE_INFINITY };
  notes.forEach((note, index) => {
    const cents = centsBetween(hz, noteToFrequency(note));
    if (Math.abs(cents) < Math.abs(best.cents)) {
      best = { index, cents };
    }
  });
  return Math.abs(best.cents) > MAX_STRING_DISTANCE_CENTS + DISTANCE_EPSILON_CENTS ? null : best;
}
