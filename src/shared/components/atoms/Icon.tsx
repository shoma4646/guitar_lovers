/**
 * Icon — Material Symbols 名で呼び出せる薄いラッパー
 *
 * Stitch のデザイン HTML では `material-symbols-outlined` で <span>アイコン名</span> を表示しているが、
 * React Native では Material Symbols フォントを直接ロードしづらいため、@expo/vector-icons の
 * MaterialIcons / MaterialCommunityIcons で同等のグリフを差し替える。
 *
 * デザインからの命名差異は本ファイルの `ICON_MAP` で吸収し、画面側は Stitch 命名のまま使える。
 */

import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps } from "react";
import { colors } from "@/shared/theme";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];
type MaterialCommunityIconName = ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

/** Stitch の Material Symbols 名 → 実際に使う vector-icons セット + 名前 への対応表 */
const ICON_MAP: Record<
  string,
  | { set: "material"; name: MaterialIconName }
  | { set: "community"; name: MaterialCommunityIconName }
> = {
  // 直接対応するもの（MaterialIcons に同名あり）
  add: { set: "material", name: "add" },
  album: { set: "material", name: "album" },
  bolt: { set: "material", name: "bolt" },
  check_circle: { set: "material", name: "check-circle" },
  equalizer: { set: "material", name: "equalizer" },
  error: { set: "material", name: "error" },
  history: { set: "material", name: "history" },
  mic: { set: "material", name: "mic" },
  play_arrow: { set: "material", name: "play-arrow" },
  refresh: { set: "material", name: "refresh" },
  remove: { set: "material", name: "remove" },
  school: { set: "material", name: "school" },
  settings: { set: "material", name: "settings" },
  star: { set: "material", name: "star" },
  timer: { set: "material", name: "timer" },
  tune: { set: "material", name: "tune" },

  // 名前差異を吸収
  auto_stories: { set: "material", name: "auto-stories" },
  emoji_events: { set: "material", name: "emoji-events" },
  music_note: { set: "material", name: "music-note" },
  play_circle: { set: "material", name: "play-circle-outline" },

  // 旧ヘッダーで使われていた可能性のあるもの（追加で必要なら拡張）
  share: { set: "material", name: "share" },
  bookmark: { set: "material", name: "bookmark-border" },
  pause: { set: "material", name: "pause" },
  skip_next: { set: "material", name: "skip-next" },
  skip_previous: { set: "material", name: "skip-previous" },
  close: { set: "material", name: "close" },
  check: { set: "material", name: "check" },
  trophy: { set: "community", name: "trophy-variant" },
  search: { set: "material", name: "search" },
  arrow_back: { set: "material", name: "arrow-back" },
  more_vert: { set: "material", name: "more-vert" },
};

export type IconName = keyof typeof ICON_MAP;

export type IconProps = {
  /** Stitch デザインで使われている Material Symbols の name（snake_case） */
  name: IconName;
  /** アイコンの一辺サイズ（px） */
  size?: number;
  /** カラー。デザイントークンから渡す想定 */
  color?: string;
};

/**
 * Icon — Stitch 命名（snake_case）の Material Symbols 風アイコン
 *
 * 例:
 * ```tsx
 * <Icon name="tune" size={24} color={colors.primary} />
 * ```
 */
export function Icon({ name, size = 24, color = colors.onSurface }: IconProps) {
  const entry = ICON_MAP[name];
  if (!entry) {
    // ICON_MAP に未登録のアイコンが指定された場合、ヘルプアイコンでフォールバック
    return <MaterialIcons name="help-outline" size={size} color={color} />;
  }
  if (entry.set === "community") {
    return (
      <MaterialCommunityIcons
        name={entry.name}
        size={size}
        color={color}
      />
    );
  }
  return <MaterialIcons name={entry.name} size={size} color={color} />;
}
