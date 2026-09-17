import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PhraseNotFoundError,
  recordPhraseResult,
} from "@/shared/services/storage";
import type { PhraseAttempt } from "@/shared/types/models";
import { showMutationError } from "@/shared/lib/showMutationError";
import { phraseAttemptsQueryKey } from "./usePhraseAttempts";
import { practicePhrasesQueryKey } from "./usePracticePhrases";

/**
 * フレーズ練習の結果を記録し、弾けた場合はフレーズの到達BPMも更新する
 * 対象フレーズが削除済みの場合はPhraseNotFoundErrorで失敗し、呼び出し側で案内する
 */
export function useRecordPhraseResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attempt: PhraseAttempt) => recordPhraseResult(attempt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phraseAttemptsQueryKey });
      queryClient.invalidateQueries({ queryKey: practicePhrasesQueryKey });
    },
    onError: (error) => {
      if (error instanceof PhraseNotFoundError) {
        queryClient.invalidateQueries({ queryKey: practicePhrasesQueryKey });
        return;
      }
      showMutationError(error);
    },
  });
}
