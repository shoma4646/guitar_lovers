/**
 * 一覧カードに表示する行数の決定
 */

export type FitListRowsInput = {
  /** 行と「他N本を見る」に使える高さ（カードの内側） */
  availableHeight: number;
  /** 1行の高さ（実測値） */
  rowHeight: number;
  /** 「他N本を見る」ボタンの高さ */
  moreHeight: number;
  /** 一覧の総数 */
  total: number;
  /** 高さが足りなくても表示する最低行数 */
  minRows: number;
};

export type FitListRowsResult = {
  /** 表示する行数 */
  rows: number;
  /** 「他N本を見る」のN。0なら出さない */
  moreCount: number;
};

/** 使える高さに「行の高さ × n ＋ 必要なら『他N本を見る』」が収まる最大の n を返す（下限は minRows） */
export function fitListRows({
  availableHeight,
  rowHeight,
  moreHeight,
  total,
  minRows,
}: FitListRowsInput): FitListRowsResult {
  if (total <= 0) return { rows: 0, moreCount: 0 };
  if (total * rowHeight <= availableHeight) {
    return { rows: total, moreCount: 0 };
  }
  const fitted = Math.floor((availableHeight - moreHeight) / rowHeight);
  const rows = Math.max(minRows, fitted);
  if (rows >= total) return { rows: total, moreCount: 0 };
  return { rows, moreCount: total - rows };
}

/** 高さを測る前の表示。従来どおり最大 maxRows 行で、超えたら最終行を「他N本を見る」にする */
export function legacyListRows(total: number, maxRows: number): FitListRowsResult {
  if (total <= maxRows) return { rows: total, moreCount: 0 };
  return { rows: maxRows - 1, moreCount: total - (maxRows - 1) };
}
