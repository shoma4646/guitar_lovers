import * as fc from "fast-check";
import {
  applyPoint,
  didClearOppositePoint,
  isAtPhraseRange,
  isValidLoopRange,
  pointSetAnnouncement,
  resolvePointTime,
} from "../abLoop";
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

describe("didClearOppositePoint", () => {
  it("A点がB点を追い越したときだけtrue", () => {
    const before = loop({ pointA: 10, pointB: 20, enabled: true });
    expect(didClearOppositePoint(before, applyPoint(before, "A", 25), "A")).toBe(true);
    expect(didClearOppositePoint(before, applyPoint(before, "A", 15), "A")).toBe(false);
  });

  it("B点がA点より前に来たときだけtrue", () => {
    const before = loop({ pointA: 10, pointB: 20, enabled: true });
    expect(didClearOppositePoint(before, applyPoint(before, "B", 5), "B")).toBe(true);
    expect(didClearOppositePoint(before, applyPoint(before, "B", 30), "B")).toBe(false);
  });

  it("反対側が未設定なら、どこに設定してもfalse", () => {
    expect(didClearOppositePoint(loop(), applyPoint(loop(), "A", 25), "A")).toBe(false);
    expect(didClearOppositePoint(loop(), applyPoint(loop(), "B", 5), "B")).toBe(false);
  });

  it("任意の区間と設定で、trueになるのは反対側が設定済みから未設定に変わったときと一致する", () => {
    const point = fc.option(fc.double({ min: 0, max: 600, noNaN: true }), { nil: null });
    fc.assert(
      fc.property(
        point,
        point,
        fc.boolean(),
        fc.constantFrom<"A" | "B">("A", "B"),
        fc.double({ min: 0, max: 600, noNaN: true }),
        (pointA, pointB, enabled, which, time) => {
          const before = loop({ pointA, pointB, enabled });
          const after = applyPoint(before, which, time);
          const opposite = which === "A" ? "pointB" : "pointA";
          expect(didClearOppositePoint(before, after, which)).toBe(
            before[opposite] !== null && after[opposite] === null,
          );
        },
      ),
    );
  });
});

describe("pointSetAnnouncement", () => {
  it("反対側を消さないときは「A点を◯に設定」だけ", () => {
    const before = loop({ pointA: 10, pointB: 20, enabled: true });
    expect(pointSetAnnouncement(before, applyPoint(before, "A", 15), "A", "15秒")).toBe("A点を15秒に設定");
  });

  it("ループ中にA点がB点を追い越すと、B点の解除とループOFFを1文で伝える", () => {
    const before = loop({ pointA: 10, pointB: 20, enabled: true });
    expect(pointSetAnnouncement(before, applyPoint(before, "A", 25), "A", "25秒")).toBe(
      "A点を25秒に設定。B点を解除し、ABループをオフにしました",
    );
  });

  it("B点をA点より前にすると、A点の解除を伝える", () => {
    const before = loop({ pointA: 10, pointB: 20, enabled: true });
    expect(pointSetAnnouncement(before, applyPoint(before, "B", 5), "B", "5秒")).toBe(
      "B点を5秒に設定。A点を解除し、ABループをオフにしました",
    );
  });

  it("ループがもともとOFFなら「ABループをオフ」とは言わない", () => {
    const before = loop({ pointA: 10, pointB: 20, enabled: false });
    expect(pointSetAnnouncement(before, applyPoint(before, "A", 25), "A", "25秒")).toBe(
      "A点を25秒に設定。B点を解除しました",
    );
  });
});

describe("isAtPhraseRange", () => {
  const phrase = { startSec: 10, endSec: 20 };

  it("A点・B点がフレーズの開始・終了位置と一致するときだけtrue", () => {
    expect(isAtPhraseRange({ pointA: 10, pointB: 20 }, phrase)).toBe(true);
    expect(isAtPhraseRange({ pointA: 10.1, pointB: 20 }, phrase)).toBe(false);
    expect(isAtPhraseRange({ pointA: 10, pointB: null }, phrase)).toBe(false);
    expect(isAtPhraseRange({ pointA: null, pointB: null }, phrase)).toBe(false);
  });
});
