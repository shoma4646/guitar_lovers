import { useQuery } from "@tanstack/react-query";
import type { NewsArticle } from "@/shared/types/models";
import { newsArticlesSchema } from "@/shared/lib/schemas/newsArticle";

const rawNewsData: unknown = require("../../../../assets/json/news.json");

export const newsArticlesQueryKey = ["news", "articles"] as const;

/** ニュース記事一覧を取得する。現状は静的JSONアセットをZod検証してラップする */
export function useNewsArticles() {
  return useQuery<NewsArticle[]>({
    queryKey: newsArticlesQueryKey,
    queryFn: async () => {
      const parsed = newsArticlesSchema.safeParse(rawNewsData);
      if (!parsed.success) {
        console.error("[useNewsArticles] news.jsonの検証に失敗", parsed.error);
        return [];
      }
      return parsed.data;
    },
    staleTime: Infinity,
  });
}
