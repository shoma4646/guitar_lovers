import { useQuery } from "@tanstack/react-query";
import { getPracticeSessions } from "@/shared/services/storage";
import type { PracticeSession } from "@/shared/types/models";

export const practiceSessionsQueryKey = ["history", "sessions"] as const;

/** 練習セッション一覧をAsyncStorageから取得する */
export function usePracticeSessions() {
  return useQuery<PracticeSession[]>({
    queryKey: practiceSessionsQueryKey,
    queryFn: getPracticeSessions,
  });
}
