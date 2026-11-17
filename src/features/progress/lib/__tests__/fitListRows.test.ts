import { fitListRows, legacyListRows } from "../fitListRows";

const base = { rowHeight: 56, moreHeight: 44, minRows: 3 };

describe("fitListRows", () => {
  it("302ptに5本は全部入るので5行・他なし", () => {
    expect(fitListRows({ ...base, availableHeight: 302, total: 5 })).toEqual({ rows: 5, moreCount: 0 });
  });

  it("250ptに5本は入らないので3行＋他2本", () => {
    expect(fitListRows({ ...base, availableHeight: 250, total: 5 })).toEqual({ rows: 3, moreCount: 2 });
  });

  it("行と「他N本を見る」が収まる最大の行数を選ぶ", () => {
    // 56×5 + 44 = 324 ≤ 330 < 56×6 + 44
    expect(fitListRows({ ...base, availableHeight: 330, total: 10 })).toEqual({ rows: 5, moreCount: 5 });
  });

  it("高さが足りなくても下限の3行は表示する", () => {
    expect(fitListRows({ ...base, availableHeight: 100, total: 5 })).toEqual({ rows: 3, moreCount: 2 });
  });

  it("下限の行数で総数に届くなら「他N本を見る」は出さない", () => {
    expect(fitListRows({ ...base, availableHeight: 100, total: 3 })).toEqual({ rows: 3, moreCount: 0 });
  });

  it("行が高くなると表示行数が減る", () => {
    const normal = fitListRows({ ...base, availableHeight: 302, total: 5 });
    const large = fitListRows({ ...base, rowHeight: 76, availableHeight: 302, total: 5 });
    expect(normal.rows).toBe(5);
    expect(large).toEqual({ rows: 3, moreCount: 2 });
  });

  it("0件なら0行", () => {
    expect(fitListRows({ ...base, availableHeight: 302, total: 0 })).toEqual({ rows: 0, moreCount: 0 });
  });
});

describe("legacyListRows", () => {
  it("4本以下は全部、5本以上は3行＋残り", () => {
    expect(legacyListRows(4, 4)).toEqual({ rows: 4, moreCount: 0 });
    expect(legacyListRows(5, 4)).toEqual({ rows: 3, moreCount: 2 });
  });
});
