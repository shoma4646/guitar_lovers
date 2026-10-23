import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { msUntilNextLocalMidnight, toLocalDay, type LocalDay } from "@/shared/lib/localDay";

/** 0:00 ちょうどに発火したタイマーが前日と判定しないための余裕 */
const MIDNIGHT_MARGIN_MS = 1000;

/**
 * 端末ローカルの今日の暦日 "YYYY-MM-DD" を返す。
 * 次のローカル 0:00 と、アプリが前面に戻ったときに値を更新する
 */
export function useLocalDay(): LocalDay {
  const [day, setDay] = useState(() => toLocalDay(new Date()));

  useEffect(() => {
    const refresh = () => setDay(toLocalDay(new Date()));
    let timer: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      timer = setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, msUntilNextLocalMidnight(new Date()) + MIDNIGHT_MARGIN_MS);
    };
    scheduleMidnight();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return day;
}
