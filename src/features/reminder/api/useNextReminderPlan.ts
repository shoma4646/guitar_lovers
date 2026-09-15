import { useQuery } from "@tanstack/react-query";
import { loadNextReminderPlan } from "@/features/reminder/services/reminderScheduler";
import type { ReminderPlan } from "@/features/reminder/lib/planReminder";
import { reminderQueryKeys } from "./useReminderSettings";

/** 次に予約されるリマインド通知の内容を取得する（対象が無ければnull） */
export function useNextReminderPlan() {
  return useQuery<ReminderPlan | null>({
    queryKey: reminderQueryKeys.nextPlan,
    queryFn: loadNextReminderPlan,
  });
}
