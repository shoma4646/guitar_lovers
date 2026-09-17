import type { QueryClient } from "@tanstack/react-query";

/**
 * アプリ内のどのmutationが成功しても、リマインドの予約を作り直す購読を張る
 *
 * 予約の入力（フレーズ・練習結果・練習セッション・設定）を変える経路は増え続けるため、
 * 各フックに個別に足すのではなくmutationの成功を一箇所で拾う。戻り値で購読を解除する
 * @param queryClient - 監視するQueryClient
 * @param sync - 成功のたびに呼ぶ処理
 */
export function subscribeReminderSync(queryClient: QueryClient, sync: () => void): () => void {
  return queryClient.getMutationCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "success") {
      sync();
    }
  });
}
