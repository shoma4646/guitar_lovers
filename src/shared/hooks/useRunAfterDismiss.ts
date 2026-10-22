import { useCallback, useRef } from "react";

/**
 * シートを閉じ終わってから次の操作を行うための予約と実行を返す
 * schedule(next)で予約し、閉じたシートのonDismissedからflush()を呼ぶと予約した操作を1回だけ実行する
 */
export function useRunAfterDismiss(): {
  schedule: (next: () => void) => void;
  flush: () => void;
} {
  const pendingRef = useRef<(() => void) | null>(null);

  const schedule = useCallback((next: () => void) => {
    pendingRef.current = next;
  }, []);

  const flush = useCallback(() => {
    const next = pendingRef.current;
    pendingRef.current = null;
    next?.();
  }, []);

  return { schedule, flush };
}
