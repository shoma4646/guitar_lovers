import * as fc from "fast-check";
import { formatDuration, formatSpokenDuration } from "../formatters";

describe("formatDuration", () => {
  it("整数秒を mm:ss で表示する", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(75)).toBe("01:15");
  });

  it("小数秒は切り捨てて mm:ss で表示する", () => {
    expect(formatDuration(12.3)).toBe("00:12");
    expect(formatDuration(59.99)).toBe("00:59");
  });

  it("任意の非負実数で mm:ss の形になる", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1e6, noNaN: true }), (s) => {
        expect(formatDuration(s)).toMatch(/^\d{2,}:\d{2}$/);
      }),
    );
  });
});

describe("formatSpokenDuration", () => {
  it("分と秒を読み上げ用の文字列にする", () => {
    expect(formatSpokenDuration(72.9)).toBe("1分12秒");
    expect(formatSpokenDuration(45)).toBe("45秒");
    expect(formatSpokenDuration(180)).toBe("3分");
    expect(formatSpokenDuration(0)).toBe("0秒");
  });
});
