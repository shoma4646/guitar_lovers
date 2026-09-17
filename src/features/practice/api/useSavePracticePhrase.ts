import { useMutation, useQueryClient } from "@tanstack/react-query";
import { savePracticePhrase } from "@/shared/services/storage";
import type { PracticePhrase } from "@/shared/types/models";
import { showMutationError } from "@/shared/lib/showMutationError";
import { practicePhrasesQueryKey } from "./usePracticePhrases";

/** 練習フレーズをAsyncStorageに保存する */
export function useSavePracticePhrase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (phrase: PracticePhrase) => savePracticePhrase(phrase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practicePhrasesQueryKey });
    },
    onError: showMutationError,
  });
}
