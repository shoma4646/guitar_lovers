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
