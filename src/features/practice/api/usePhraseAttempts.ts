import { queryOptions, useQuery } from "@tanstack/react-query";
import { getPhraseAttempts } from "@/shared/services/storage";

export const phraseAttemptsQueryKey = ["practice", "phraseAttempts"] as const;

/** 全フレーズ練習結果のqueryの定義（画面以外からキャッシュを共有して読むときにも使う） */
export const phraseAttemptsQueryOptions = queryOptions({
  queryKey: phraseAttemptsQueryKey,
  queryFn: getPhraseAttempts,
});

/** 全フレーズ練習結果をAsyncStorageから取得する */
export function usePhraseAttempts() {
  return useQuery(phraseAttemptsQueryOptions);
}
