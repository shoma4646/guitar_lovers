import { queryOptions, useQuery } from "@tanstack/react-query";
import { getPracticeSessions } from "@/shared/services/storage";

export const practiceSessionsQueryKey = ["history", "sessions"] as const;

/** 練習セッション一覧のqueryの定義（画面以外からキャッシュを共有して読むときにも使う） */
export const practiceSessionsQueryOptions = queryOptions({
  queryKey: practiceSessionsQueryKey,
  queryFn: getPracticeSessions,
});

/** 練習セッション一覧をAsyncStorageから取得する */
export function usePracticeSessions() {
  return useQuery(practiceSessionsQueryOptions);
}
