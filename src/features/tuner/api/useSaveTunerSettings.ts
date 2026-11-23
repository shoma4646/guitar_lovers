import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveTunerSettings } from "@/shared/services/storage";
import type { TunerSettings } from "@/shared/lib/schemas/tunerSettings";
import { showMutationError } from "@/shared/lib/showMutationError";
import { tunerQueryKeys } from "./useTunerSettings";

/**
 * チューナー設定を保存し、保存できた値で設定のキャッシュを更新する
 * 失敗しても取り直さない（調弦中に画面の選択が保存値へ戻ると、別のプリセットで判定してしまうため）
 */
export function useSaveTunerSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: TunerSettings) => saveTunerSettings(settings),
    onSuccess: (saved) => {
      queryClient.setQueryData<TunerSettings>(tunerQueryKeys.settings, saved);
    },
    onError: showMutationError,
  });
}
