type ReadQuery = { isError: boolean; data: unknown };
type RefetchableQuery = { refetch: () => unknown };

/**
 * 読み出しに失敗して表示できる値が無いクエリが1つでもあるかを返す
 * 以前に読めた値が残っていれば、それを表示できるので失敗扱いにしない
 */
export function hasReadFailure(...queries: ReadQuery[]): boolean {
  return queries.some((query) => query.isError && query.data === undefined);
}

/** 渡したクエリをすべて取り直す（再読み込みボタン用） */
export function refetchAll(...queries: RefetchableQuery[]): void {
  for (const query of queries) void query.refetch();
}
