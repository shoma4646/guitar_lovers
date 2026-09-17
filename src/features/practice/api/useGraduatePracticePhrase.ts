import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePracticePhrase } from "@/shared/services/storage";
import { showMutationError } from "@/shared/lib/showMutationError";
import { practicePhrasesQueryKey } from "./usePracticePhrases";

type GraduateArgs = {
  id: string;
  /** 目標BPMに到達した日時（ISO 8601形式） */
  graduatedAt: string;
};

/** 練習フレーズの卒業日時を記録する（卒業かどうかの判定はisGraduatedで行う） */
export function useGraduatePracticePhrase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, graduatedAt }: GraduateArgs) =>
      updatePracticePhrase(id, { graduatedAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practicePhrasesQueryKey });
    },
    onError: showMutationError,
  });
}
