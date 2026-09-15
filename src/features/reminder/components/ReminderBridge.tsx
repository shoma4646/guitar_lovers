import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { syncReminder } from "@/features/reminder/services/reminderScheduler";
import { REMINDER_DATA_TYPE } from "@/features/reminder/lib/planReminder";
import { reminderQueryKeys } from "@/features/reminder/api/useReminderSettings";

/**
 * リマインド通知とアプリの状態をつなぐ（何も描画しない）
 *
 * 起動時・前面復帰時・バックグラウンド移行時に予約を作り直し、
 * リマインド通知のタップでPracticeタブを開く
 */
export function ReminderBridge() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponseKey = useRef<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      void syncReminder().then(() =>
        queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all }),
      );
    };
    refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" || state === "background") {
        refresh();
      }
    });
    return () => subscription.remove();
  }, [queryClient]);

  useEffect(() => {
    if (!lastResponse) return;
    if (lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const { request, date } = lastResponse.notification;
    if (request.content.data?.type !== REMINDER_DATA_TYPE) return;

    // useLastNotificationResponseは再描画のたびに同じ応答を返すため、1回だけ遷移する
    const responseKey = `${request.identifier}:${date}`;
    if (handledResponseKey.current === responseKey) return;
    handledResponseKey.current = responseKey;
    router.push("/(tabs)/practice");
  }, [lastResponse, router]);

  return null;
}
