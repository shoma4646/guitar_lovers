import * as fc from "fast-check";
import { applyPoint, isValidLoopRange, resolvePointTime } from "../abLoop";
import { markerRatios } from "../seekBar";
import type { ABLoop } from "@/shared/types/models";

function loop(overrides: Partial<ABLoop> = {}): ABLoop {
  return { pointA: null, pointB: null, enabled: false, ...overrides };
}

describe("isValidLoopRange", () => {
  it("A点がB点より前ならtrue", () => {
    expect(isValidLoopRange(loop({ pointA: 10, pointB: 20 }))).toBe(true);
  });

  it("片方でも未設定ならfalse", () => {
    expect(isValidLoopRange(loop({ pointA: 10, pointB: null }))).toBe(false);
    expect(isValidLoopRange(loop({ pointA: null, pointB: 20 }))).toBe(false);
  });

  it("A点がB点以上ならfalse", () => {
    expect(isValidLoopRange(loop({ pointA: 20, pointB: 20 }))).toBe(false);
    expect(isValidLoopRange(loop({ pointA: 30, pointB: 20 }))).toBe(false);
  });
});

describe("applyPoint", () => {
  it("A点を設定する（B点が無ければそのまま維持）", () => {
    const result = applyPoint(loop(), "A", 10);
    expect(result).toEqual({ pointA: 10, pointB: null, enabled: false });
  });

  it("B点を設定する", () => {
    const result = applyPoint(loop({ pointA: 10 }), "B", 30);
    expect(result).toEqual({ pointA: 10, pointB: 30, enabled: false });
  });

  it("A点をB点以上に設定すると区間が逆転するため、B点をnullにしてループを無効化する", () => {
    const current = loop({ pointA: 10, pointB: 20, enabled: true });
    const result = applyPoint(current, "A", 20);
    expect(result).toEqual({ pointA: 20, pointB: null, enabled: false });
  });

  it("B点をA点以下に設定すると区間が逆転するため、A点をnullにしてループを無効化する", () => {
    const current = loop({ pointA: 10, pointB: 20, enabled: true });
    const result = applyPoint(current, "B", 10);
    expect(result).toEqual({ pointA: null, pointB: 10, enabled: false });
  });

  it("有効な区間を保つ設定なら、ループの有効状態は変えない", () => {
    const current = loop({ pointA: 10, pointB: 20, enabled: true });
    const result = applyPoint(current, "B", 40);
    expect(result).toEqual({ pointA: 10, pointB: 40, enabled: true });
  });
});

describe("resolvePointTime", () => {
  it("B点は0.1秒単位で切り上げ、押した位置より前にならない", () => {
    const b = resolvePointTime("B", 12.93, 60);
    expect(b).toBeCloseTo(13.0);
    expect(b).toBeGreaterThan(12.93);
  });

  it("A点は0.1秒単位で切り捨てる", () => {
    expect(resolvePointTime("A", 12.86, 60)).toBeCloseTo(12.8);
  });

  it("0.1秒刻みちょうどの位置は浮動小数の誤差で1刻みずれない", () => {
    expect(resolvePointTime("B", 0.3, 60)).toBeCloseTo(0.3);
    expect(resolvePointTime("A", 0.3, 60)).toBeCloseTo(0.3);
  });

  it("B点は動画の長さを超えず、長さ未取得（0）なら上限をかけない", () => {
    expect(resolvePointTime("B", 59.97, 59.98)).toBe(59.98);
    expect(resolvePointTime("B", 59.97, 0)).toBeCloseTo(60.0);
  });

  it("A=10.31、B=10.84 の順に設定しても A が消えず区間ができる", () => {
    let current = applyPoint(loop(), "A", resolvePointTime("A", 10.31, 60));
    current = applyPoint(current, "B", resolvePointTime("B", 10.84, 60));
    expect(current.pointA).not.toBeNull();
    expect(isValidLoopRange(current)).toBe(true);
  });

  it("A/B 設定とループ切替の任意の列で、区間の不変条件が保たれる", () => {
    const op = fc.oneof(
      fc.record({ kind: fc.constantFrom<"A" | "B">("A", "B"), ratio: fc.double({ min: 0, max: 1, noNaN: true }) }),
      fc.constant({ kind: "toggle" as const, ratio: 0 }),
    );
    fc.assert(
      fc.property(fc.double({ min: 0.5, max: 3600, noNaN: true }), fc.array(op, { maxLength: 30 }), (duration, ops) => {
        let current = loop();
        for (const o of ops) {
          if (o.kind === "toggle") {
            if (isValidLoopRange(current)) current = { ...current, enabled: !current.enabled };
          } else {
            const t = o.ratio * duration;
            current = applyPoint(current, o.kind, resolvePointTime(o.kind, t, duration));
            if (o.kind === "B") expect(current.pointB!).toBeGreaterThanOrEqual(t);
            else expect(current.pointA!).toBeLessThanOrEqual(t);
          }
          if (current.pointA !== null && current.pointB !== null) expect(current.pointA).toBeLessThan(current.pointB);
          if (current.enabled) expect(isValidLoopRange(current)).toBe(true);
          const markers = markerRatios(current, duration);
          for (const m of markers) {
            expect(m.ratio).toBeGreaterThanOrEqual(0);
            expect(m.ratio).toBeLessThanOrEqual(1);
          }
          if (markers.length === 2) expect(markers[0].ratio).toBeLessThanOrEqual(markers[1].ratio);
        }
      }),
    );
  });
});
