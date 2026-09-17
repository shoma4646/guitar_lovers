import type {
  PhraseAttempt,
  PracticePhrase,
  PracticeSession,
} from "@/shared/types/models";
import type { ReminderSettings } from "@/shared/lib/schemas/reminderSettings";
import { computeNextFireAt } from "./reminderTime";
import { buildReminderMessage, pickReminderPhrase } from "./reminderMessage";

/** リマインド通知のdataに入れる種別。通知タップ時の判定に使う */
export const REMINDER_DATA_TYPE = "practice-reminder";

/** リマインド通知のdataに入れる内容 */
export type ReminderNotificationData = { type: typeof REMINDER_DATA_TYPE; phraseId: string };

/** 予約するリマインド通知の内容 */
export type ReminderPlan = {
  fireAt: Date;
  title: string;
  body: string;
  data: ReminderNotificationData;
};

/** 通知のdataがリマインド通知のものかを判定する型ガード */
export function isReminderNotificationData(
  data: Record<string, unknown> | undefined,
): data is ReminderNotificationData {
  return !!data && data.type === REMINDER_DATA_TYPE && typeof data.phraseId === "string";
}

/**
 * 設定と練習データから、次に予約するリマインド通知を決める
 * 設定がOFF、または対象フレーズが無ければnullを返す
 * @param params.now - 現在日時
 */
export function planReminder({
  phrases,
  attempts,
  sessions,
  settings,
  now,
}: {
  phrases: PracticePhrase[];
  attempts: PhraseAttempt[];
  sessions: PracticeSession[];
  settings: ReminderSettings;
  now: Date;
}): ReminderPlan | null {
  if (!settings.enabled) return null;
  const phrase = pickReminderPhrase(phrases, attempts);
  if (!phrase) return null;

  const fireAt = computeNextFireAt({
    practiceDates: [...attempts.map((a) => a.date), ...sessions.map((s) => s.date)],
    activityDates: phrases.map((p) => p.createdAt),
    override: settings.timeOverride,
    now,
  });
  const { title, body } = buildReminderMessage({
    phrase,
    phraseAttempts: attempts.filter((a) => a.phraseId === phrase.id),
    fireAt,
  });
  return {
    fireAt,
    title,
    body,
    data: { type: REMINDER_DATA_TYPE, phraseId: phrase.id },
  };
}
