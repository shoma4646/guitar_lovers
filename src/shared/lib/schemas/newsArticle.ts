import { z } from "zod";

/** ニュース記事のZodスキーマ */
export const newsArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  excerpt: z.string(),
  image: z.string(),
  date: z.string(),
  category: z.string(),
  url: z.string().optional(),
});

export const newsArticlesSchema = z.array(newsArticleSchema);
