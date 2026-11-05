import type { QueryClient } from "@tanstack/react-query";

/**
 * mutationの meta に付けると、成功してもリマインドの予約を作り直さない
 * 予約の入力（フレーズ・練習結果・練習セッション・設定）を変えない操作だけに付ける
 */
export const SKIP_REMINDER_SYNC_META = { skipReminderSync: true } as const;

/**
 * mutationが成功するたびにリマインドの予約を作り直す購読を張る（SKIP_REMINDER_SYNC_META付きのmutationは除く）
 *
 * 予約の入力を変える経路は増え続けるため、各フックに個別に足すのではなくmutationの成功を一箇所で拾い、
 * 予約に関係しない操作のほうを明示的に除外する。戻り値で購読を解除する
 * @param queryClient - 監視するQueryClient
 * @param sync - 成功のたびに呼ぶ処理
 */
export function subscribeReminderSync(queryClient: QueryClient, sync: () => void): () => void {
  return queryClient.getMutationCache().subscribe((event) => {
    if (
      event.type === "updated" &&
      event.action.type === "success" &&
      event.mutation.meta?.skipReminderSync !== SKIP_REMINDER_SYNC_META.skipReminderSync
    ) {
      sync();
    }
  });
}
