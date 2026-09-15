import { useQuery } from "@tanstack/react-query";
import { getReminderSettings } from "@/shared/services/storage";
import type { ReminderSettings } from "@/shared/lib/schemas/reminderSettings";

/** リマインド関連のqueryKey。allを無効化すると設定・許可状態・次回予定をまとめて取り直す */
export const reminderQueryKeys = {
  all: ["reminder"] as const,
  settings: ["reminder", "settings"] as const,
  permission: ["reminder", "permission"] as const,
  nextPlan: ["reminder", "nextPlan"] as const,
};

/** リマインド設定をAsyncStorageから取得する */
export function useReminderSettings() {
  return useQuery<ReminderSettings>({
    queryKey: reminderQueryKeys.settings,
    queryFn: getReminderSettings,
  });
}
