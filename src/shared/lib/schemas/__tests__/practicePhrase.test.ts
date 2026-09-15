import { practicePhrasesSchema } from "../practicePhrase";

function makePhrase(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "a",
    videoId: "vid",
    videoTitle: "曲",
    name: "速弾きフレーズ1",
    startSec: 10,
    endSec: 20,
    currentBpm: 70,
    targetBpm: 110,
    playbackRate: 1.0,
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("practicePhrasesSchema", () => {
  it("必須フィールドのみで通る", () => {
    const result = practicePhrasesSchema.safeParse([makePhrase()]);
    expect(result.success).toBe(true);
  });

  it("archivedAtを含めて通る", () => {
    const data = [makePhrase({ archivedAt: "2026-08-11T00:00:00.000Z" })];
    const result = practicePhrasesSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("initialBpmとgraduatedAtを含めて通る", () => {
    const data = [
      makePhrase({ initialBpm: 70, graduatedAt: "2026-08-12T00:00:00.000Z" }),
    ];
    expect(practicePhrasesSchema.safeParse(data).success).toBe(true);
  });

  it("initialBpmが範囲外なら失敗する", () => {
    expect(practicePhrasesSchema.safeParse([makePhrase({ initialBpm: 20 })]).success).toBe(
      false,
    );
  });

  it("graduatedAtが日時として不正なら失敗する", () => {
    expect(
      practicePhrasesSchema.safeParse([makePhrase({ graduatedAt: "yesterday" })]).success,
    ).toBe(false);
  });

  it("currentBpmが0以下のときは失敗する", () => {
    const data = [makePhrase({ currentBpm: 0 })];
    const result = practicePhrasesSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("BPMがメトロノームの上限240を超えるときは失敗する", () => {
    const data = [makePhrase({ targetBpm: 300 })];
    const result = practicePhrasesSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("endSecがstartSec以下のときは失敗する", () => {
    expect(
      practicePhrasesSchema.safeParse([makePhrase({ startSec: 20, endSec: 20 })]).success,
    ).toBe(false);
    expect(
      practicePhrasesSchema.safeParse([makePhrase({ startSec: 30, endSec: 20 })]).success,
    ).toBe(false);
  });

  it("startSecが負の値のときは失敗する", () => {
    const data = [makePhrase({ startSec: -1 })];
    const result = practicePhrasesSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("型が違うフィールドがあれば失敗する", () => {
    const data = [makePhrase({ name: 123 })];
    const result = practicePhrasesSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("空配列は通る", () => {
    const result = practicePhrasesSchema.safeParse([]);
    expect(result.success).toBe(true);
  });
});
