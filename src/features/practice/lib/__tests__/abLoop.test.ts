import { applyPoint, isValidLoopRange, shouldLoopBack } from "../abLoop";
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

describe("shouldLoopBack", () => {
  it("ループ有効・A/B両方設定済み・B点到達で真を返す", () => {
    const abLoop = loop({ pointA: 10, pointB: 20, enabled: true });
    expect(shouldLoopBack(20, abLoop)).toBe(true);
    expect(shouldLoopBack(25, abLoop)).toBe(true);
  });

  it("B点未到達なら偽を返す", () => {
    const abLoop = loop({ pointA: 10, pointB: 20, enabled: true });
    expect(shouldLoopBack(19.9, abLoop)).toBe(false);
  });

  it("ループ無効なら偽を返す", () => {
    const abLoop = loop({ pointA: 10, pointB: 20, enabled: false });
    expect(shouldLoopBack(25, abLoop)).toBe(false);
  });

  it("A点・B点のいずれかが未設定なら偽を返す", () => {
    expect(shouldLoopBack(25, loop({ pointA: 10, pointB: null, enabled: true }))).toBe(false);
    expect(shouldLoopBack(25, loop({ pointA: null, pointB: 20, enabled: true }))).toBe(false);
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
