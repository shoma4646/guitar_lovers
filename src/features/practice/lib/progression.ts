import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import { BPM_MAX } from "@/shared/constants/bpm";
import { isSameLocalDay } from "@/features/reminder/lib/reminderTime";

/** 1回の成功で引き上げる目標BPMの幅 */
const BPM_STEP = 5;

/** 今日の練習メニューでの優先区分。retry=前回あやしい/弾けなかった, stale=記録あり, fresh=未記録, graduated=目標BPM到達済み */
export type TodayMenuPriority = "retry" | "stale" | "fresh" | "graduated";

/** フレーズの「今日の記録を除いた目標」と、その目標に対する当日の達成状況 */
export type TodayProgress = {
  /** 今日始める前に提示されていた目標BPM（当日の記録を除いて計算するため1日を通して変わらない） */
  targetBeforeToday: number;
  /** 当日のok記録のうち最大のBPM（無ければundefined） */
  todayBestOkBpm: number | undefined;
  /** todayBestOkBpmがtargetBeforeToday以上なら達成 */
  reached: boolean;
};

/** 今日の練習メニューの1行分 */
export type TodayMenuEntry = {
  phrase: PracticePhrase;
  latest: PhraseAttempt | undefined;
  /** 今日の目標と達成状況。目標BPMはどの導線でもここを使う */
  today: TodayProgress;
  priority: TodayMenuPriority;
};

const PRIORITY_ORDER: Record<TodayMenuPriority, number> = {
  retry: 0,
  stale: 1,
  fresh: 2,
  graduated: 3,
};

/**
 * 練習結果一覧から最新の1件を返す（dateで降順比較）
 * @param attempts - 対象フレーズの練習結果一覧
 */
export function getLatestAttempt(
  attempts: PhraseAttempt[],
): PhraseAttempt | undefined {
  if (attempts.length === 0) return undefined;
  return [...attempts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];
}

/**
 * 記録を加味した到達BPMを返す
 *
 * 結果の保存と到達BPMの更新は別々の書き込みなので、記録だけ残って到達BPMが
 * 未更新の状態がありうる。「弾けた」記録の最大BPMと保存済みの到達BPMの大きい方を採る
 * @param currentBpm - フレーズに保存されている到達BPM
 * @param attempts - 対象フレーズの練習結果一覧
 */
export function resolveCurrentBpm(
  currentBpm: number,
  attempts: PhraseAttempt[],
): number {
  return attempts.reduce(
    (max, attempt) =>
      attempt.result === "ok" && attempt.bpm > max ? attempt.bpm : max,
    currentBpm,
  );
}

/**
 * 今日の目標BPMを計算する
 *
 * 直近の結果が到達BPM以上のテンポで「弾けた（ok）」なら到達BPMから+5。
 * それ以外（あやしい・弾けなかった・到達BPMより遅いテンポでの成功・記録なし）は据え置く。
 * 上限はフレーズの目標BPM（既に超えていれば到達BPM）とメトロノーム上限のいずれか低い方。
 * @param currentBpm - フレーズの現在の到達BPM
 * @param latestAttempt - 直近の練習結果（無ければundefined）
 * @param targetBpm - フレーズの目標BPM
 */
export function computeTodayTargetBpm(
  currentBpm: number,
  latestAttempt: PhraseAttempt | undefined,
  targetBpm: number,
): number {
  const clearedAtCurrentTempo =
    latestAttempt?.result === "ok" && latestAttempt.bpm >= currentBpm;
  if (!clearedAtCurrentTempo) {
    return currentBpm;
  }
  return Math.min(currentBpm + BPM_STEP, Math.max(targetBpm, currentBpm), BPM_MAX);
}

/**
 * フレーズの当日の目標達成状況を計算する（今日の目標BPMの唯一の算出元）
 *
 * 当日の記録を含めて目標を求めると、今日ok記録を残すたびに目標が前進して達成判定がずれるため、
 * 目標は当日より前の記録だけから求める。起点の到達BPMは保存時のBPM（initialBpm）と当日より前のok記録の大きい方
 * @param phrase - 対象フレーズ
 * @param attempts - 対象フレーズの練習結果一覧（順不同で可）
 * @param now - 「今日」を決める基準日時（通知文面なら通知が届く日時）
 */
export function resolveTodayProgress(
  phrase: Pick<PracticePhrase, "currentBpm" | "targetBpm" | "initialBpm">,
  attempts: PhraseAttempt[],
  now: Date,
): TodayProgress {
  const attemptsBeforeToday = attempts.filter((a) => !isSameLocalDay(new Date(a.date), now));
  const targetBeforeToday = computeTodayTargetBpm(
    resolveCurrentBpmBeforeToday(phrase, attemptsBeforeToday),
    getLatestAttempt(attemptsBeforeToday),
    phrase.targetBpm,
  );

  const todayOkBpms = attempts
    .filter((a) => a.result === "ok" && isSameLocalDay(new Date(a.date), now))
    .map((a) => a.bpm);
  const todayBestOkBpm = todayOkBpms.length > 0 ? Math.max(...todayOkBpms) : undefined;

  return {
    targetBeforeToday,
    todayBestOkBpm,
    reached: todayBestOkBpm !== undefined && todayBestOkBpm >= targetBeforeToday,
  };
}

function resolveCurrentBpmBeforeToday(
  phrase: Pick<PracticePhrase, "currentBpm" | "initialBpm">,
  attemptsBeforeToday: PhraseAttempt[],
): number {
  if (phrase.initialBpm !== undefined) {
    return resolveCurrentBpm(phrase.initialBpm, attemptsBeforeToday);
  }
  // initialBpmを持たない古いデータでは、当日のok記録で書き換わったcurrentBpmを起点にすると当日分が混ざるため、
  // 当日より前のok記録があればそれだけから再構築する
  const okBpmsBeforeToday = attemptsBeforeToday.filter((a) => a.result === "ok").map((a) => a.bpm);
  return okBpmsBeforeToday.length > 0 ? Math.max(...okBpmsBeforeToday) : phrase.currentBpm;
}

/**
 * フレーズが目標BPMに到達済み（卒業）かを返す
 * @param resolvedCurrentBpm - resolveCurrentBpmで記録を加味した到達BPM
 * @param targetBpm - フレーズの目標BPM
 */
export function isGraduated(resolvedCurrentBpm: number, targetBpm: number): boolean {
  return resolvedCurrentBpm >= targetBpm;
}

function classifyTodayMenuPriority(
  latest: PhraseAttempt | undefined,
  resolvedCurrentBpm: number,
  targetBpm: number,
): TodayMenuPriority {
  if (isGraduated(resolvedCurrentBpm, targetBpm)) return "graduated";
  if (!latest) return "fresh";
  return latest.result === "ok" ? "stale" : "retry";
}

function compareTodayMenuEntries(a: TodayMenuEntry, b: TodayMenuEntry): number {
  const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (byPriority !== 0) return byPriority;
  if (a.latest && b.latest) {
    const byLatestDate = Date.parse(a.latest.date) - Date.parse(b.latest.date);
    if (byLatestDate !== 0) return byLatestDate;
  }
  const byUpdatedAt = Date.parse(a.phrase.updatedAt) - Date.parse(b.phrase.updatedAt);
  if (byUpdatedAt !== 0) return byUpdatedAt;
  return a.phrase.id < b.phrase.id ? -1 : a.phrase.id > b.phrase.id ? 1 : 0;
}

/**
 * アーカイブ済みを除いたフレーズを今日の練習順に並べる
 *
 * 前回あやしい/弾けなかった → 前回弾けた → 未記録 → 目標BPM到達済みの順。
 * 記録ありは区分内で最終記録の古い順。同順位はupdatedAtの古い順、最後にidの順
 * @param phrases - 全フレーズ
 * @param attempts - 全練習結果
 * @param now - 「今日」を決める基準日時
 */
export function buildTodayMenu(
  phrases: PracticePhrase[],
  attempts: PhraseAttempt[],
  now: Date,
): TodayMenuEntry[] {
  const attemptsByPhrase = new Map<string, PhraseAttempt[]>();
  for (const attempt of attempts) {
    const list = attemptsByPhrase.get(attempt.phraseId);
    if (list) {
      list.push(attempt);
    } else {
      attemptsByPhrase.set(attempt.phraseId, [attempt]);
    }
  }

  return phrases
    .filter((phrase) => !phrase.archivedAt)
    .map((phrase) => {
      const phraseAttempts = attemptsByPhrase.get(phrase.id) ?? [];
      const latest = getLatestAttempt(phraseAttempts);
      const resolvedCurrentBpm = resolveCurrentBpm(phrase.currentBpm, phraseAttempts);
      return {
        phrase,
        latest,
        today: resolveTodayProgress(phrase, phraseAttempts, now),
        priority: classifyTodayMenuPriority(latest, resolvedCurrentBpm, phrase.targetBpm),
      };
    })
    .sort(compareTodayMenuEntries);
}

/**
 * 並び替え済みメニューから今日の1本を返す
 * 目標BPM到達済みのフレーズは選ばない（全件到達済み・空ならundefined）
 * @param menu - buildTodayMenuの戻り値
 */
export function pickTodayPick(menu: TodayMenuEntry[]): TodayMenuEntry | undefined {
  const first = menu[0];
  return first && first.priority !== "graduated" ? first : undefined;
}

/**
 * 卒業していればその日時を返し、未卒業ならundefinedを返す
 *
 * 日時は graduatedAt → 目標BPM以上で弾けた最初の記録 → createdAt の順に採る。
 * 目標BPMを引き上げて未到達になった場合は graduatedAt が残っていても undefined を返す
 * @param phrase - 対象フレーズ
 * @param attempts - 対象フレーズの練習結果一覧（順不同で可）
 */
export function resolveGraduatedAt(
  phrase: Pick<PracticePhrase, "currentBpm" | "targetBpm" | "graduatedAt" | "createdAt">,
  attempts: PhraseAttempt[],
): string | undefined {
  if (!isGraduated(resolveCurrentBpm(phrase.currentBpm, attempts), phrase.targetBpm)) {
    return undefined;
  }
  if (phrase.graduatedAt) return phrase.graduatedAt;
  const firstReached = attempts
    .filter((a) => a.result === "ok" && a.bpm >= phrase.targetBpm)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  return firstReached?.date ?? phrase.createdAt;
}
