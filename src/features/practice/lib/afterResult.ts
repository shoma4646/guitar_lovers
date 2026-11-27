import type { PracticePhrase } from "@/shared/types/models";
import type { TodayMenuEntry } from "./progression";

/** 結果を記録した後に行うこと。nextがあれば次の1本の候補 */
export type AfterResultPlan = {
  next?: { phrase: PracticePhrase; startBpm: number };
};

/**
 * 今日のメニューのうち、卒業済みと当日すでに目標へ到達したものを除いた「今日まだ残っている」行を返す
 * @param todayMenu - buildTodayMenuの戻り値
 */
export function filterOpenMenuEntries(todayMenu: TodayMenuEntry[]): TodayMenuEntry[] {
  return todayMenu.filter((entry) => entry.priority !== "graduated" && !entry.today.reached);
}

/**
 * 「記録して次の1本へ」で進む先を選ぶ。今日まだ残っている行のうち、記録中のフレーズ以外の先頭を返す
 * @param todayMenu - buildTodayMenuの戻り値
 * @param currentPhraseId - いま記録しているフレーズのID
 */
export function pickNextMenuEntry(
  todayMenu: TodayMenuEntry[],
  currentPhraseId: string,
): TodayMenuEntry | undefined {
  return filterOpenMenuEntries(todayMenu).find((entry) => entry.phrase.id !== currentPhraseId);
}

/**
 * 練習結果を保存した直後に、次の1本（開始BPMは今日の目標）を決める
 * @param input.phrase - 記録したフレーズ
 * @param input.todayMenu - 記録前に組んだ今日のメニュー（buildTodayMenuの戻り値）
 */
export function planAfterResult({
  phrase,
  todayMenu,
}: {
  phrase: PracticePhrase;
  todayMenu: TodayMenuEntry[];
}): AfterResultPlan {
  const plan: AfterResultPlan = {};

  const nextEntry = pickNextMenuEntry(todayMenu, phrase.id);
  if (nextEntry) {
    plan.next = { phrase: nextEntry.phrase, startBpm: nextEntry.today.targetBeforeToday };
  }

  return plan;
}
