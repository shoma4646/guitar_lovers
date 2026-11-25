import type { ABLoop, Bookmark, PracticePhrase } from "@/shared/types/models";
import { isAtPhraseRange, isValidLoopRange } from "./abLoop";
import { formatDuration } from "./formatters";

/** 動画を切り替えると失われる、まだ保存していない区間とブックマーク */
export type UnsavedWork = {
  /** 有効で、同じ動画の保存済みフレーズのどれとも一致しない区間。無ければnull */
  unsavedRange: { startSec: number; endSec: number } | null;
  /** ブックマークの件数（ブックマークは保存されないため全件が対象） */
  bookmarkCount: number;
};

/** 読み込み中の動画で、まだ保存していない区間とブックマークを求める */
export function findUnsavedWork(input: {
  abLoop: ABLoop;
  bookmarks: Bookmark[];
  loadedVideoId: string | null;
  savedPhrases: PracticePhrase[];
}): UnsavedWork {
  const { abLoop, bookmarks, loadedVideoId, savedPhrases } = input;
  if (loadedVideoId === null) return { unsavedRange: null, bookmarkCount: 0 };
  const isSaved = savedPhrases.some((p) => p.videoId === loadedVideoId && isAtPhraseRange(abLoop, p));
  const unsavedRange =
    abLoop.pointA !== null && abLoop.pointB !== null && isValidLoopRange(abLoop) && !isSaved
      ? { startSec: abLoop.pointA, endSec: abLoop.pointB }
      : null;
  return { unsavedRange, bookmarkCount: bookmarks.length };
}

/** 区間の表示（例: 「区間 01:23〜01:41」） */
export function formatUnsavedRange(range: { startSec: number; endSec: number }): string {
  return `区間 ${formatDuration(range.startSec)}〜${formatDuration(range.endSec)}`;
}

function joinItems(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join("、")}と${items[items.length - 1]}`;
}

/**
 * 別のフレーズ・動画へ切り替える前に出す確認の見出しと本文を返す。失うものが無ければnull
 * @param input.practiceRecord - 練習中フレーズの名前と弾き終えた回数。練習中でなければnull
 * @param input.unsaved - 切り替えで失われる区間・ブックマーク
 */
export function buildSwitchConfirmation(input: {
  practiceRecord: { phraseName: string; completedReps: number } | null;
  unsaved: UnsavedWork;
}): { title: string; message: string } | null {
  const { practiceRecord, unsaved } = input;
  const hasReps = practiceRecord !== null && practiceRecord.completedReps > 0;
  const recordItem = hasReps ? [`「${practiceRecord.phraseName}」を${practiceRecord.completedReps}回弾いた記録`] : [];
  const workItems = [
    ...(unsaved.unsavedRange ? [formatUnsavedRange(unsaved.unsavedRange)] : []),
    ...(unsaved.bookmarkCount > 0 ? [`ブックマーク${unsaved.bookmarkCount}件`] : []),
  ];
  if (recordItem.length === 0 && workItems.length === 0) return null;
  const listed = [...recordItem, ...(workItems.length > 0 ? [joinItems(workItems)] : [])].join("、");
  return {
    title: hasReps ? "練習中の記録が消えます" : "保存していない内容が消えます",
    message: `${listed}はまだ保存されていません。切り替えると失われます。`,
  };
}

/** ABループの「×」で、まだ保存していない区間を解除する前に出す確認の見出しと本文 */
export function buildClearLoopConfirmation(range: { startSec: number; endSec: number }): {
  title: string;
  message: string;
} {
  return {
    title: "区間を解除しますか",
    message: `${formatUnsavedRange(range)}はまだ保存されていません。解除すると失われます。`,
  };
}
