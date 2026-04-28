import { newsArticlesSchema } from "../newsArticle";

describe("newsArticlesSchema", () => {
  it("必須フィールドが揃っていれば通る", () => {
    const data = [
      {
        id: "1",
        title: "新製品発売",
        excerpt: "概要",
        image: "https://example.com/a.jpg",
        date: "2026-04-27",
        category: "新製品",
      },
    ];
    expect(newsArticlesSchema.safeParse(data).success).toBe(true);
  });

  it("urlが文字列なら任意フィールドとして通る", () => {
    const data = [
      {
        id: "1",
        title: "t",
        excerpt: "e",
        image: "i",
        date: "2026-04-27",
        category: "c",
        url: "https://example.com",
      },
    ];
    expect(newsArticlesSchema.safeParse(data).success).toBe(true);
  });

  it("必須フィールドが欠けていれば失敗する", () => {
    const data = [{ id: "1", title: "t" }];
    expect(newsArticlesSchema.safeParse(data).success).toBe(false);
  });
});
