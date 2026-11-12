/** 周波数を画面に出す桁（小数1桁）の文字列にする。未検出ならnull */
export function hzDisplayDigits(hz: number | null): string | null {
  return hz === null ? null : hz.toFixed(1);
}

/** 入力レベルを画面に出す桁（整数dB）の文字列にする。停止中・無音（-Infinity）ならnull */
export function inputLevelDisplayDigits(db: number | null): string | null {
  return db === null || !Number.isFinite(db) ? null : db.toFixed(0);
}
