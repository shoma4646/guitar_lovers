import type { QueryClient } from "@tanstack/react-query";
import { getReminderSettings } from "@/shared/services/storage";
import { practicePhrasesQueryOptions } from "@/features/practice/api/usePracticePhrases";
import { phraseAttemptsQueryOptions } from "@/features/practice/api/usePhraseAttempts";
import { practiceSessionsQueryOptions } from "@/features/progress/api/usePracticeSessions";
import type { ReminderInputsLoader } from "@/features/reminder/services/reminderScheduler";

/**
 * 予約を決めるデータの読み込み関数を作る。練習データは画面と同じqueryのキャッシュを使い、
 * 未取得・無効化済みのものだけ端末から読む（取り直し中なら、その取り直しの結果を待つ）
 * @param queryClient - 画面と共有するQueryClient
 */
export function createCachedReminderInputsLoader(queryClient: QueryClient): ReminderInputsLoader {
  return async () => {
    const [phrases, attempts, sessions, settings] = await Promise.all([
      queryClient.fetchQuery(practicePhrasesQueryOptions),
      queryClient.fetchQuery(phraseAttemptsQueryOptions),
      queryClient.fetchQuery(practiceSessionsQueryOptions),
      // 設定のキャッシュは保存前の楽観的な値を持つことがあるため、保存値を直接読む
      getReminderSettings(),
    ]);
    return { phrases, attempts, sessions, settings };
  };
}
