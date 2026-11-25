import * as fc from "fast-check";
import { formatDuration, formatSpokenDuration, shouldShowHours } from "../formatters";

describe("formatDuration", () => {
  it("整数秒を mm:ss で表示する", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(75)).toBe("01:15");
  });

  it("小数秒は切り捨てて mm:ss で表示する", () => {
    expect(formatDuration(12.3)).toBe("00:12");
    expect(formatDuration(59.99)).toBe("00:59");
  });

  it("1時間未満の任意の非負実数で mm:ss の形になる", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 3599.99, noNaN: true }), (s) => {
        expect(formatDuration(s)).toMatch(/^\d{2}:\d{2}$/);
      }),
    );
  });

  it("3600秒以上は自動で時:分:秒にする", () => {
    expect(formatDuration(4210)).toBe("1:10:10");
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3599)).toBe("59:59");
    expect(formatDuration(485)).toBe("08:05");
  });

  it("withHours: true なら1時間未満でも時の桁を付ける", () => {
    expect(formatDuration(485, { withHours: true })).toBe("0:08:05");
    expect(formatDuration(4210, { withHours: true })).toBe("1:10:10");
  });

  it("任意の非負実数で、分と秒が60未満のまま元の秒数に戻せる", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1e6, noNaN: true }), fc.boolean(), (s, withHours) => {
        const text = formatDuration(s, { withHours });
        const parts = text.split(":").map(Number);
        const [h, m, sec] = parts.length === 3 ? parts : [0, ...parts];
        expect(m).toBeLessThan(60);
        expect(sec).toBeLessThan(60);
        expect(h * 3600 + m * 60 + sec).toBe(Math.floor(s));
      }),
    );
  });
});

describe("shouldShowHours", () => {
  it("どれかが3600秒以上なら true", () => {
    expect(shouldShowHours(485, 4210)).toBe(true);
    expect(shouldShowHours(3600)).toBe(true);
    expect(shouldShowHours(485, 3599)).toBe(false);
    expect(shouldShowHours()).toBe(false);
  });
});

describe("formatSpokenDuration", () => {
  it("分と秒を読み上げ用の文字列にする", () => {
    expect(formatSpokenDuration(72.9)).toBe("1分12秒");
    expect(formatSpokenDuration(45)).toBe("45秒");
    expect(formatSpokenDuration(180)).toBe("3分");
    expect(formatSpokenDuration(0)).toBe("0秒");
  });

  it("1時間以上は時間を付けて読み上げる", () => {
    expect(formatSpokenDuration(4210)).toBe("1時間10分10秒");
    expect(formatSpokenDuration(3600)).toBe("1時間");
    expect(formatSpokenDuration(3605)).toBe("1時間5秒");
  });
});
