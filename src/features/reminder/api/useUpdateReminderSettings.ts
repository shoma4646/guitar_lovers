import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateReminderSettings } from "@/shared/services/storage";
import type { ReminderSettings } from "@/shared/lib/schemas/reminderSettings";
import { showMutationError } from "@/shared/lib/showMutationError";
import { syncReminder } from "@/features/reminder/services/reminderScheduler";
import { reminderQueryKeys } from "./useReminderSettings";

/** リマインド設定を更新し、通知の予約を作り直す */
export function useUpdateReminderSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<ReminderSettings>) => {
      const next = await updateReminderSettings(patch);
      await syncReminder();
      return next;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all });
    },
    onError: showMutationError,
  });
}
