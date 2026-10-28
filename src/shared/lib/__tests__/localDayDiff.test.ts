import * as fc from "fast-check";
import { diffLocalDays } from "../localDay";

describe("diffLocalDays", () => {
  it("経過時間ではなく暦日の差を返す", () => {
    expect(diffLocalDays(new Date(2026, 9, 26, 23, 0), new Date(2026, 9, 27, 8, 0))).toBe(1);
    expect(diffLocalDays(new Date(2026, 9, 27, 0, 1), new Date(2026, 9, 27, 23, 59))).toBe(0);
    expect(diffLocalDays(new Date(2026, 9, 27, 8, 0), new Date(2026, 9, 26, 23, 0))).toBe(-1);
  });

  it("夏時間の切り替え日（25時間・23時間の日）をまたいでも1日は1日として数える", () => {
    expect(diffLocalDays(new Date(2026, 9, 19, 0, 0), new Date(2026, 9, 25, 23, 30))).toBe(6);
    expect(diffLocalDays(new Date(2026, 9, 26, 0, 0), new Date(2026, 10, 1, 23, 30))).toBe(6);
    expect(diffLocalDays(new Date(2026, 2, 23, 0, 0), new Date(2026, 2, 29, 23, 30))).toBe(6);
  });

  it("同じ暦日どうしなら0、暦日を n 日進めると n になる", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(2000, 0, 1), max: new Date(2099, 11, 31), noInvalidDate: true }),
        fc.integer({ min: -400, max: 400 }),
        fc.integer({ min: 0, max: 23 }),
        (from, n, hour) => {
          const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + n, hour, 0, 0, 0);
          expect(diffLocalDays(from, to)).toBe(n);
        },
      ),
    );
  });
});
