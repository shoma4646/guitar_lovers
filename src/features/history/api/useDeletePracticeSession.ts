import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePracticeSession } from "@/shared/services/storage";
import { practiceSessionsQueryKey } from "./usePracticeSessions";

/** 練習セッションをAsyncStorageから削除する */
export function useDeletePracticeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePracticeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practiceSessionsQueryKey });
    },
  });
}
