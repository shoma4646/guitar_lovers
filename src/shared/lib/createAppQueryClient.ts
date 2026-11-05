import { QueryClient } from "@tanstack/react-query";

/**
 * アプリで使うQueryClientを作る
 * 端末内のデータは書き換える操作の後に無効化して取り直すため、前面復帰や再マウントでは読み直さない
 * （読み込みに失敗してデータが無いqueryは従来どおり前面復帰・再マウントで再取得する）
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: Infinity },
    },
  });
}
