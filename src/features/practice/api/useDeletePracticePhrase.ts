import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePracticePhrase } from "@/shared/services/storage";
import { showMutationError } from "@/shared/lib/showMutationError";
import { practicePhrasesQueryKey } from "./usePracticePhrases";
import { phraseAttemptsQueryKey } from "./usePhraseAttempts";

/** 練習フレーズをAsyncStorageから削除する。関連するフレーズ練習結果も併せて削除される */
export function useDeletePracticePhrase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePracticePhrase(id),
    // 途中で失敗しても結果だけは削除済みのことがあるため、成否によらず取り直す
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: practicePhrasesQueryKey });
      queryClient.invalidateQueries({ queryKey: phraseAttemptsQueryKey });
    },
    onError: showMutationError,
  });
}
