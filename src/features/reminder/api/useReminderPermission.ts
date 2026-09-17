import { useQuery } from "@tanstack/react-query";
import {
  getReminderPermission,
  type ReminderPermission,
} from "@/features/reminder/services/reminderScheduler";
import { reminderQueryKeys } from "./useReminderSettings";

/** 通知の許可状態を取得する */
export function useReminderPermission() {
  return useQuery<ReminderPermission>({
    queryKey: reminderQueryKeys.permission,
    queryFn: getReminderPermission,
  });
}
