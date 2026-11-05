import { queryOptions, useQuery } from "@tanstack/react-query";
import { getPracticePhrases } from "@/shared/services/storage";

export const practicePhrasesQueryKey = ["practice", "phrases"] as const;

/** 練習フレーズ一覧のqueryの定義（画面以外からキャッシュを共有して読むときにも使う） */
export const practicePhrasesQueryOptions = queryOptions({
  queryKey: practicePhrasesQueryKey,
  queryFn: getPracticePhrases,
});

/** 練習フレーズ一覧をAsyncStorageから取得する */
export function usePracticePhrases() {
  return useQuery(practicePhrasesQueryOptions);
}
