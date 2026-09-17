/**
 * リマインド通知の予約と通知許可を扱うサービス
 * 予約は固定identifierの1件だけにし、呼ぶたびに最新のデータで作り直す
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  getPhraseAttempts,
  getPracticePhrases,
  getPracticeSessions,
  getReminderSettings,
} from "@/shared/services/storage";
import { planReminder, type ReminderPlan } from "../lib/planReminder";

/** 予約するリマインド通知のidentifier */
export const REMINDER_NOTIFICATION_ID = "practice-reminder";
const REMINDER_CHANNEL_ID = "practice-reminder";

/** リマインド通知の許可状態 */
export type ReminderPermission = {
  granted: boolean;
  /** OSの許可ダイアログをまだ出せるか */
  canAskAgain: boolean;
  /** まだ一度も許可・拒否していないか */
  undetermined: boolean;
};

function isGranted(status: Notifications.NotificationPermissionsStatus): boolean {
  return (
    status.granted ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "練習リマインド",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * 現在の通知許可状態を返す
 */
export async function getReminderPermission(): Promise<ReminderPermission> {
  const status = await Notifications.getPermissionsAsync();
  const granted = isGranted(status);
  return {
    granted,
    canAskAgain: status.canAskAgain,
    undetermined:
      !granted &&
      status.canAskAgain &&
      (status.ios === undefined ||
        status.ios.status === Notifications.IosAuthorizationStatus.NOT_DETERMINED),
  };
}

/**
 * 通知許可を確認し、未許可でまだ依頼できるならOSの許可ダイアログを出す
 * @returns 許可されていればtrue
 */
export async function ensureReminderPermission(): Promise<boolean> {
  // Android 13以降はチャンネルが1つも無いと許可ダイアログが出ない
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (isGranted(current)) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true },
  });
  return isGranted(requested);
}

/**
 * 保存済みの設定と練習データから、次に予約するリマインド通知を求める
 */
export async function loadNextReminderPlan(): Promise<ReminderPlan | null> {
  const [phrases, attempts, sessions, settings] = await Promise.all([
    getPracticePhrases(),
    getPhraseAttempts(),
    getPracticeSessions(),
    getReminderSettings(),
  ]);
  return planReminder({ phrases, attempts, sessions, settings, now: new Date() });
}

async function syncOnce(): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  const plan = isGranted(permission) ? await loadNextReminderPlan() : null;

  await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID);
  if (!plan) return;

  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_NOTIFICATION_ID,
    content: { title: plan.title, body: plan.body, data: plan.data },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: plan.fireAt,
      channelId: REMINDER_CHANNEL_ID,
    },
  });
}

let running: Promise<void> | null = null;
let rerunRequested = false;
let lastSyncError: unknown = null;

/** 直前のsyncReminderの結果。失敗していればその例外、成功していればnull */
export function getLastSyncError(): unknown {
  return lastSyncError;
}

/**
 * リマインド通知の予約を最新の状態に合わせる（何度呼んでも予約は1件以下）
 *
 * 許可が無い・設定がOFF・対象フレーズが無ければ予約を取り消す。
 * 実行中に呼ばれたら実行中の処理を共有し、終わった後にもう1回だけ作り直す。
 * 失敗はログに残すだけで例外にしないが、getLastSyncErrorで読み出せる
 */
export function syncReminder(): Promise<void> {
  if (running) {
    rerunRequested = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        rerunRequested = false;
        try {
          await syncOnce();
          lastSyncError = null;
        } catch (e) {
          lastSyncError = e;
          console.error("[reminder] 通知の予約の更新に失敗", e);
        }
      } while (rerunRequested);
    } finally {
      running = null;
    }
  })();
  return running;
}

/**
 * iOSがDATEトリガーの予約を返す際の実際の形（UNCalendarNotificationTrigger相当）
 * expo-notificationsの型定義には無いため、実測に基づいてここでのみ定義する
 */
type CalendarLikeTrigger = {
  type: "calendar";
  dateComponents: {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    second?: number;
  };
};

function extractTriggerFireAt(trigger: Notifications.NotificationTrigger): Date | null {
  if (!trigger || typeof trigger !== "object" || !("type" in trigger)) return null;
  if (trigger.type === "date" && "date" in trigger) {
    const value = trigger.date;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  // iOSはDATEトリガーもUNCalendarNotificationTriggerとして返すため、日時要素から組み立てる
  if (trigger.type === "calendar" && "dateComponents" in trigger) {
    const { year, month, day, hour, minute, second } = (trigger as CalendarLikeTrigger)
      .dateComponents;
    if (year == null || month == null || day == null) return null;
    const date = new Date(year, month - 1, day, hour ?? 0, minute ?? 0, second ?? 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * 実際に予約されているリマインド通知の発火日時を返す（予約が無ければnull）
 * 計算結果ではなくOSに登録済みの予約そのものを見る
 */
export async function getScheduledReminderFireAt(): Promise<Date | null> {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  const request = requests.find((r) => r.identifier === REMINDER_NOTIFICATION_ID);
  return request ? extractTriggerFireAt(request.trigger) : null;
}
