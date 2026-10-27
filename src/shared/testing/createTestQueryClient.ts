import { QueryClient } from "@tanstack/react-query";

/**
 * テスト用のQueryClientを作る。gcタイマーを残さないのでjestが終了でき、queryの失敗は再試行しない。
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
}
