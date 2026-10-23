import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

/**
 * 画面がフォーカス中で、かつactiveがtrueの間だけ画面の自動ロックを抑止する
 * 抑止はtag単位で行い、条件が外れたとき・画面を離れたとき・アンマウント時に同じtagで解除する
 * @param active - 抑止したい状態か
 * @param tag - 抑止に使うタグ。画面ごとに別の値を渡す
 */
export function useKeepAwakeWhileFocused(active: boolean, tag: string): void {
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const shouldKeepAwake = isFocused && active;

  useEffect(() => {
    if (!shouldKeepAwake) return;
    activateKeepAwakeAsync(tag).catch((e) => {
      console.warn("[keep-awake] 画面ロックの抑止に失敗", e);
    });
    return () => {
      deactivateKeepAwake(tag).catch((e) => {
        console.warn("[keep-awake] 画面ロック抑止の解除に失敗", e);
      });
    };
  }, [shouldKeepAwake, tag]);
}
