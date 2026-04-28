import { practiceSessionsSchema } from "../practiceSession";

describe("practiceSessionsSchema", () => {
  it("最小フィールドのみで通る", () => {
    const data = [{ id: "a", date: "2026-04-27", duration: 100 }];
    const result = practiceSessionsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("任意フィールドを含めて通る", () => {
    const data = [
      {
        id: "a",
        date: "2026-04-27",
        duration: 100,
        videoId: "vid",
        videoTitle: "曲",
        notes: "メモ",
      },
    ];
    const result = practiceSessionsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("durationが負の値のときは失敗する", () => {
    const data = [{ id: "a", date: "2026-04-27", duration: -1 }];
    const result = practiceSessionsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("型が違うフィールドがあれば失敗する", () => {
    const data = [{ id: 1, date: "2026-04-27", duration: 10 }];
    const result = practiceSessionsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("空配列は通る", () => {
    const result = practiceSessionsSchema.safeParse([]);
    expect(result.success).toBe(true);
  });
});
