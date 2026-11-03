import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateReminderSettings } from "@/shared/services/storage";
import type { ReminderSettings } from "@/shared/lib/schemas/reminderSettings";
import { showMutationError } from "@/shared/lib/showMutationError";
import { syncReminder } from "@/features/reminder/services/reminderScheduler";
import { reminderQueryKeys } from "./useReminderSettings";

const UPDATE_REMINDER_SETTINGS_MUTATION_KEY = ["reminder", "updateSettings"] as const;

/**
 * リマインド設定を更新し、通知の予約を作り直す
 * 設定のキャッシュには保存を待たずに反映し（長押しの連続変更で前の値を起点にしないため）、
 * 最後の更新が終わったときに取り直す。失敗時は取り直しで端末の保存値へ戻る
 */
export function useUpdateReminderSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: UPDATE_REMINDER_SETTINGS_MUTATION_KEY,
    mutationFn: async (patch: Partial<ReminderSettings>) => {
      const next = await updateReminderSettings(patch);
      await syncReminder();
      return next;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: reminderQueryKeys.settings });
      const definedPatch = Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined),
      ) as Partial<ReminderSettings>;
      queryClient.setQueryData<ReminderSettings>(reminderQueryKeys.settings, (prev) =>
        prev ? { ...prev, ...definedPatch } : prev,
      );
    },
    onError: showMutationError,
    onSettled: () => {
      // 後続の更新が残っているうちに取り直すと、その楽観的な値を古い保存値で上書きしてしまう
      if (queryClient.isMutating({ mutationKey: UPDATE_REMINDER_SETTINGS_MUTATION_KEY }) === 1) {
        void queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all });
      }
    },
  });
}
