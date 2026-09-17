import { z } from "zod";

/** リマインド通知の時刻（ローカル時刻）のZodスキーマ */
export const reminderTimeSchema = z.object({
  hour: z.number().int().min(0).max(23),
  minute: z.union([z.literal(0), z.literal(15), z.literal(30), z.literal(45)]),
});

/** リマインド通知設定のZodスキーマ。AsyncStorage復元値をパースする */
export const reminderSettingsSchema = z.object({
  enabled: z.boolean(),
  /** 手動で指定した送信時刻。nullなら練習時刻の傾向から自動で決める */
  timeOverride: reminderTimeSchema.nullable(),
  /** 通知許可を依頼した日時。設定済みなら再依頼しない */
  permissionPromptedAt: z.iso.datetime().nullable(),
});

export type ReminderTime = z.infer<typeof reminderTimeSchema>;
export type ReminderSettings = z.infer<typeof reminderSettingsSchema>;

/**
 * 保存値が無いときのリマインド設定
 * enabledは既定でfalse。ユーザーが明示的にONにする（またはOS許可を得た）操作を経て初めてtrueになる
 */
export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  timeOverride: null,
  permissionPromptedAt: null,
};
