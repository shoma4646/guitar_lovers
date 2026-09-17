import { useQuery } from "@tanstack/react-query";
import {
  getLastSyncError,
  getScheduledReminderFireAt,
} from "@/features/reminder/services/reminderScheduler";
import { reminderQueryKeys } from "./useReminderSettings";

/** 実際に予約されているリマインド通知の状態 */
export type NextReminderPlan = {
  /** 予約の発火日時（OSに予約が見当たらなければnull） */
  fireAt: Date | null;
  /** 直近の予約の作り直しが失敗したか */
  syncFailed: boolean;
};

/**
 * 実際に予約されているリマインド通知の状態を取得する
 * 計算上の次回予定ではなく、OSに登録済みの予約とsyncReminderの成否を見る
 */
export function useNextReminderPlan() {
  return useQuery<NextReminderPlan>({
    queryKey: reminderQueryKeys.nextPlan,
    queryFn: async () => ({
      fireAt: await getScheduledReminderFireAt(),
      syncFailed: getLastSyncError() !== null,
    }),
  });
}
