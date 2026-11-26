import { useWindowDimensions } from "react-native";

/** 動画カード（メニュー集・お気に入り）の寸法 */
export type VideoCardMetrics = {
  card: { padding: number; gap: number };
  /** YouTubeのサムネ（16:9）を切り抜かずに出すため、幅÷高さは16:9に保つ */
  thumb: { width: number; height: number };
  title: { fontSize: number; fontWeight: "700"; lineHeight: number };
};

/** この幅未満では通常の寸法だとタイトル欄が約90ptになり、1行5文字で切れる */
const NARROW_SCREEN_WIDTH = 360;

const REGULAR: VideoCardMetrics = {
  card: { padding: 16, gap: 16 },
  thumb: { width: 96, height: 54 },
  title: { fontSize: 18, fontWeight: "700", lineHeight: 22 },
};

const NARROW: VideoCardMetrics = {
  card: { padding: 12, gap: 12 },
  thumb: { width: 80, height: 45 },
  title: { fontSize: 16, fontWeight: "700", lineHeight: 20 },
};

/** 画面幅に応じた動画カードの寸法を返す。幅360未満ではタイトル欄を広げるためにサムネ・余白・文字を小さくする */
export function useVideoCardMetrics(): VideoCardMetrics {
  const { width } = useWindowDimensions();
  return width < NARROW_SCREEN_WIDTH ? NARROW : REGULAR;
}
