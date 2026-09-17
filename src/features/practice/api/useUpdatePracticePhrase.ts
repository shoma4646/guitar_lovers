import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePracticePhrase } from "@/shared/services/storage";
import type { PracticePhrase } from "@/shared/types/models";
import { showMutationError } from "@/shared/lib/showMutationError";
import { practicePhrasesQueryKey } from "./usePracticePhrases";

type PhrasePatch = Partial<Omit<PracticePhrase, "id">>;

type UpdateArgs = {
  id: string;
  patch: PhrasePatch;
};

/**
 * 目標BPMを変える更新では卒業日時をクリアする（卒業かどうかは新しい目標BPMで導出し直す）
 * 呼び出し側がgraduatedAtを明示していればそれを尊重する
 * @param patch - 更新するフィールドの差分
 */
export function resetGraduationOnTargetChange(patch: PhrasePatch): PhrasePatch {
  if (!("targetBpm" in patch) || "graduatedAt" in patch) return patch;
  return { ...patch, graduatedAt: undefined };
}

/** 練習フレーズの一部フィールドを更新する。目標BPMを変えた場合は卒業日時をクリアする */
export function useUpdatePracticePhrase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateArgs) =>
      updatePracticePhrase(id, resetGraduationOnTargetChange(patch)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practicePhrasesQueryKey });
    },
    onError: showMutationError,
  });
}
