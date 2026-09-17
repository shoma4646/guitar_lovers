import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import {
  buildTodayMenu,
  computeTodayTargetBpm,
  getLatestAttempt,
  isGraduated,
  pickTodayPick,
  resolveCurrentBpm,
} from "@/features/practice/lib/progression";
import { isSameLocalDay } from "./reminderTime";

const MAX_NAME_LENGTH = 20;

/** リマインド通知のタイトル */
export const REMINDER_TITLE = "今日の練習";

/**
 * リマインドに出すフレーズを選ぶ
 *
 * 今日の練習メニューの「今日の1本」と同じフレーズを返す。
 * 全て卒業済みなら最後に作成した未アーカイブのフレーズ、対象が無ければnullを返す
 * @param phrases - 全フレーズ
 * @param attempts - 全フレーズの練習結果
 */
export function pickReminderPhrase(
  phrases: PracticePhrase[],
  attempts: PhraseAttempt[],
): PracticePhrase | null {
  const pick = pickTodayPick(buildTodayMenu(phrases, attempts));
  if (pick) return pick.phrase;

  const active = phrases.filter((phrase) => !phrase.archivedAt);
  if (active.length === 0) return null;
  return active.reduce((a, b) =>
    Date.parse(b.createdAt) > Date.parse(a.createdAt) ? b : a,
  );
}

function truncateName(name: string): string {
  const chars = [...name];
  return chars.length > MAX_NAME_LENGTH
    ? `${chars.slice(0, MAX_NAME_LENGTH).join("")}…`
    : name;
}

function isDayBefore(date: Date, base: Date): boolean {
  const dayBefore = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1);
  return isSameLocalDay(date, dayBefore);
}

/** dateがbaseの前日より古い（前々日以前）か */
function isOlderThanDayBefore(date: Date, base: Date): boolean {
  const dayBeforeStart = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1);
  return date.getTime() < dayBeforeStart.getTime();
}

/**
 * フレーズの記録からリマインド通知の文面を作る
 *
 * 目標BPMは今日の練習メニューと同じ計算で求める。「昨日」は通知が届く日から見て判定する
 * @param params.phrase - 対象フレーズ
 * @param params.phraseAttempts - 対象フレーズの練習結果
 * @param params.fireAt - 通知が届く日時
 */
export function buildReminderMessage({
  phrase,
  phraseAttempts,
  fireAt,
}: {
  phrase: PracticePhrase;
  phraseAttempts: PhraseAttempt[];
  fireAt: Date;
}): { title: string; body: string } {
  const name = truncateName(phrase.name);
  const latest = getLatestAttempt(phraseAttempts);
  const currentBpm = resolveCurrentBpm(phrase.currentBpm, phraseAttempts);
  const todayTargetBpm = computeTodayTargetBpm(currentBpm, latest, phrase.targetBpm);

  return { title: REMINDER_TITLE, body: buildBody() };

  function buildBody(): string {
    if (isGraduated(currentBpm, phrase.targetBpm)) {
      return `『${name}』は目標の${phrase.targetBpm}に届いています。今日も${currentBpm}で仕上げ`;
    }
    if (!latest) {
      if (isOlderThanDayBefore(new Date(phrase.createdAt), fireAt)) {
        return `『${name}』はまだ練習していません。今日は${todayTargetBpm}から始めましょう`;
      }
      return `『${name}』を保存しました。今日は${todayTargetBpm}から始めましょう`;
    }
    if (latest.result !== "ok") {
      return `『${name}』、前回は${latest.bpm}で練習しました。今日は${todayTargetBpm}から`;
    }
    const when = isDayBefore(new Date(latest.date), fireAt) ? "を昨日" : "は前回";
    return `『${name}』${when}${latest.bpm}で弾けました。今日は${todayTargetBpm}に挑戦`;
  }
}
