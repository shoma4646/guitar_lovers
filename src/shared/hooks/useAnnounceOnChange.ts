/**
 * 表示した文言をスクリーンリーダーで読み上げる
 *
 * iOSの VoiceOver は accessibilityRole="alert" や accessibilityLiveRegion の表示変化を読まないため、
 * OSの告知APIで読み上げる。
 */

import { useEffect } from "react";
import { AccessibilityInfo } from "react-native";

/** messageが変わるたびに1回読み上げる。nullの間は読まず、同じ文言のまま再描画しても重ねて読まない */
export function useAnnounceOnChange(message: string | null): void {
  useEffect(() => {
    if (message !== null) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
}
