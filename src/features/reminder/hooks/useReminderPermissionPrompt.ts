import { useCallback } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { getReminderSettings, updateReminderSettings } from "@/shared/services/storage";
import {
  ensureReminderPermission,
  getReminderPermission,
  syncReminder,
} from "@/features/reminder/services/reminderScheduler";
import { reminderQueryKeys } from "@/features/reminder/api/useReminderSettings";

/**
 * フレーズ保存後に通知許可を依頼する関数を返す
 *
 * 一度でも依頼していれば何もしない。OSの許可ダイアログは一度しか出せないため、
 * 先にアプリ内で確認し、受け取ると答えた場合だけOSに依頼する
 */
export function useReminderPermissionPrompt(): () => Promise<void> {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    try {
      const settings = await getReminderSettings();
      if (settings.permissionPromptedAt) return;
      const permission = await getReminderPermission();
      if (!permission.undetermined) return;

      // 依頼済みフラグはAlertの各ボタンが押された後に書く。表示前に書くと、
      // 表示中のクラッシュ・強制終了で二度と依頼できなくなる
      const markPrompted = () =>
        updateReminderSettings({ permissionPromptedAt: new Date().toISOString() }).catch((e) =>
          console.error("[reminder] 通知許可の依頼記録に失敗", e),
        );

      Alert.alert("練習リマインド", "明日、このフレーズの続きを通知でお知らせしますか？", [
        {
          text: "今はしない",
          style: "cancel",
          onPress: () => {
            void markPrompted().then(() =>
              queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all }),
            );
          },
        },
        {
          text: "通知を受け取る",
          onPress: () => {
            void (async () => {
              await markPrompted();
              const granted = await ensureReminderPermission();
              if (granted) {
                await updateReminderSettings({ enabled: true });
              }
              await syncReminder();
              queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all });
            })().catch((e) => console.error("[reminder] 通知許可の依頼に失敗", e));
          },
        },
      ]);
    } catch (e) {
      console.error("[reminder] 通知許可の確認に失敗", e);
    }
  }, [queryClient]);
}
