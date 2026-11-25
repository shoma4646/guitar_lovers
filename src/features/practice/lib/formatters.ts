import type { PresetCategory } from "@/shared/types/models";

const SECONDS_PER_HOUR = 3600;

/**
 * 秒数を mm:ss 形式にフォーマットする（小数秒は切り捨てる）。
 * 3600秒以上、または withHours: true なら h:mm:ss にする
 */
export function formatDuration(seconds: number, options?: { withHours?: boolean }): string {
  const total = Math.floor(seconds);
  const h = Math.floor(total / SECONDS_PER_HOUR);
  const m = Math.floor((total % SECONDS_PER_HOUR) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return options?.withHours || h > 0 ? `${h}:${mmss}` : mmss;
}

/** 同じ動画の位置を並べて表示するとき、時の桁を揃えて付けるべきか（どれかが1時間以上なら true） */
export function shouldShowHours(...seconds: number[]): boolean {
  return seconds.some((s) => s >= SECONDS_PER_HOUR);
}

/** 秒数を読み上げ用の「1時間2分12秒」形式にする（小数秒は切り捨てる） */
export function formatSpokenDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / SECONDS_PER_HOUR);
  const m = Math.floor((total % SECONDS_PER_HOUR) / 60);
  const s = total % 60;
  const spoken = `${h > 0 ? `${h}時間` : ""}${m > 0 ? `${m}分` : ""}${s > 0 ? `${s}秒` : ""}`;
  return spoken === "" ? "0秒" : spoken;
}

/** カテゴリ表示名マッピング */
export const CATEGORY_LABELS: Record<PresetCategory, string> = {
  chord: "コード",
  scale: "スケール",
  fingerpicking: "フィンガーピッキング",
  strumming: "ストローク",
  technique: "テクニック",
};
