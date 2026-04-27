import { useQuery } from "@tanstack/react-query";
import type { NewsArticle } from "@/shared/types/models";

const newsData: NewsArticle[] = require("../../../../assets/json/news.json");

export const newsArticlesQueryKey = ["news", "articles"] as const;

/** ニュース記事一覧を取得する。現状は静的JSONアセットをラップする */
export function useNewsArticles() {
  return useQuery<NewsArticle[]>({
    queryKey: newsArticlesQueryKey,
    queryFn: async () => newsData,
    staleTime: Infinity,
  });
}
