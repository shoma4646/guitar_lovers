import { useQuery } from "@tanstack/react-query";
import { getTunerSettings } from "@/shared/services/storage";
import type { TunerSettings } from "@/shared/lib/schemas/tunerSettings";

/** チューナー設定のqueryKey */
export const tunerQueryKeys = {
  settings: ["tuner", "settings"] as const,
};

/** チューナー設定をAsyncStorageから取得する */
export function useTunerSettings() {
  return useQuery<TunerSettings>({
    queryKey: tunerQueryKeys.settings,
    queryFn: getTunerSettings,
    // 端末内の読み出しなので、オフライン扱いでも止めない（止まるとチューナーが判定を出せなくなる）
    networkMode: "always",
  });
}
