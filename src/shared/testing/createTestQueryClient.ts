import { QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/shared/lib/createAppQueryClient";

/**
 * テスト用のQueryClientを作る。アプリと同じ既定値（staleTime等）を引き継ぎ、
 * gcタイマーを残さないのでjestが終了でき、queryの失敗は再試行しない。
 */
export function createTestQueryClient(): QueryClient {
  const client = createAppQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    queries: { ...defaults.queries, retry: false, gcTime: Infinity },
    mutations: { ...defaults.mutations, gcTime: Infinity },
  });
  return client;
}
