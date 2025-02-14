import { Article } from "../types";

export const getArticleKey = (article: Article): string => {
  return article.id;
};

export const getFeedKey = (email: string): string => {
  return `${email}_rss`;
};
