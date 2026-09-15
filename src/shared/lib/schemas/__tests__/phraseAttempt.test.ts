import { phraseAttemptsSchema } from "../phraseAttempt";

describe("phraseAttemptsSchema", () => {
  it("正しいデータで通る", () => {
    const data = [
      { id: "a", phraseId: "p1", date: "2026-08-10T00:00:00.000Z", bpm: 75, result: "ok" },
    ];
    const result = phraseAttemptsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("resultが不正な値のときは失敗する", () => {
    const data = [
      { id: "a", phraseId: "p1", date: "2026-08-10T00:00:00.000Z", bpm: 75, result: "good" },
    ];
    const result = phraseAttemptsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("bpmが0以下のときは失敗する", () => {
    const data = [
      { id: "a", phraseId: "p1", date: "2026-08-10T00:00:00.000Z", bpm: 0, result: "ok" },
    ];
    const result = phraseAttemptsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("bpmが240を超えるときは失敗する", () => {
    const data = [
      { id: "a", phraseId: "p1", date: "2026-08-10T00:00:00.000Z", bpm: 241, result: "ok" },
    ];
    const result = phraseAttemptsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("dateがISO 8601日時でないときは失敗する", () => {
    const data = [
      { id: "a", phraseId: "p1", date: "2026-08-10", bpm: 75, result: "ok" },
    ];
    expect(phraseAttemptsSchema.safeParse(data).success).toBe(false);
  });

  it("空配列は通る", () => {
    const result = phraseAttemptsSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it("repsを持たない既存形式のデータも通る", () => {
    const data = [
      { id: "a", phraseId: "p1", date: "2026-08-10T00:00:00.000Z", bpm: 75, result: "ok" },
    ];
    const result = phraseAttemptsSchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data?.[0].reps).toBeUndefined();
  });

  it("repsが正の整数なら通り、値が保持される", () => {
    const data = [
      { id: "a", phraseId: "p1", date: "2026-08-10T00:00:00.000Z", bpm: 75, result: "ok", reps: 3 },
    ];
    const result = phraseAttemptsSchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data?.[0].reps).toBe(3);
  });

  it.each([0, 1.5, "3"])("repsが%pのときは失敗する", (reps) => {
    const data = [
      { id: "a", phraseId: "p1", date: "2026-08-10T00:00:00.000Z", bpm: 75, result: "ok", reps },
    ];
    expect(phraseAttemptsSchema.safeParse(data).success).toBe(false);
  });
});
