import { useMutation, useQueryClient } from "@tanstack/react-query";
import { savePracticeSession } from "@/shared/services/storage";
import type { PracticeSession } from "@/shared/types/models";
import { practiceSessionsQueryKey } from "./usePracticeSessions";

/** 練習セッションをAsyncStorageに保存する */
export function useSavePracticeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (session: PracticeSession) => savePracticeSession(session),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practiceSessionsQueryKey });
    },
  });
}
