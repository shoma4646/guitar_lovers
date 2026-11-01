/**
 * 画面レイアウトの基準値
 *
 * 各タブは縦スクロールなしで1画面に収める方針のため、高さ予算の前提をここに集約する。
 */

/** タブバーのうちホームインジケータを除いた高さ */
export const TAB_BAR_CONTENT_HEIGHT = 56;

/** タブバー上端の罫線からタブ項目までの余白 */
export const TAB_BAR_PADDING_TOP = 2;

/** タブ項目の上下に React Navigation（uikit 形式）が付ける余白。ライブラリ固定値で、こちらからは変えられない */
export const TAB_ITEM_VERTICAL_PADDING = 5;

/** 選択中タブのアイコン背景（楕円）の幅 */
export const TAB_ICON_PILL_WIDTH = 56;

/** 選択中タブのアイコン背景（楕円）の高さ。ライブラリ既定のアイコン枠の高さと同じにして縦の配置を変えない */
export const TAB_ICON_PILL_HEIGHT = 28;

/** タブのアイコンとラベルの間隔 */
export const TAB_LABEL_MARGIN_TOP = 3;

/** 1画面に収めるために最低限必要な作業領域の高さ。これを下回る端末ではスクロールへ切り替える */
export const MIN_ONE_SCREEN_BUDGET = 680;

/** ScreenFrameの左右パディング。フルブリード表示したい要素はこの値ぶん逆マージンで打ち消す */
export const SCREEN_HORIZONTAL_PADDING = 16;

/** 1画面レイアウトを保てる文字サイズ倍率の上限。これを超える文字サイズ設定ではスクロールへ切り替える */
export const MAX_ONE_SCREEN_FONT_SCALE = 1.15;

/** 大きな数値表示（BPM・回数・音名）の文字サイズ拡大の上限。これ以上拡大すると1画面の高さ予算を大きく崩す */
export const NUMERIC_MAX_FONT_SIZE_MULTIPLIER = 1.3;
