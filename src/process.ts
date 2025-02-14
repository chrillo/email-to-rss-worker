import PostalMime from "postal-mime";
import { hashEmail } from "./utils/email-utils";
import { parseNewsletter } from "./utils/ai";
import { Article } from "./types";
import { renderRss } from "./utils/rss";
import { getFeedKey } from "./utils/keys";
import { env } from "hono/adapter";

export async function processEmail(
  message: ForwardableEmailMessage,
  env: Env
): Promise<void> {
  try {
    const to = message?.to;

    const parsedEmail = await PostalMime.parse(message.raw);

    await processHtml(env, to, parsedEmail.html || parsedEmail.text || "");

    console.log("Processed email for:", to);
  } catch (e) {
    console.error("Error parsing newsletter:", e);
  }
}

export const processHtml = async (env: Env, email: string, html: string) => {
  const emailHash = await hashEmail(email);
  const articles = await parseContent(env, emailHash, html);
  const rss = await buildFeedArticles(env, emailHash, articles);
  return rss;
};

const parseContent = async (env: Env, emailHash: string, content: string) => {
  const articles = await parseNewsletter(env, emailHash, content);

  for (const article of articles) {
    await env.EMAIL_TO_RSS_KV.put(article.id, JSON.stringify(article));
  }

  return articles;
};

const buildFeedArticles = async (
  env: Env,
  emailHash: string,
  newArticles: Article[]
) => {
  const articlesKeys = await env.EMAIL_TO_RSS_KV.list({
    prefix: `${emailHash}:`,
    limit: 100,
  });

  const articles = (
    await Promise.all(
      articlesKeys.keys.map(async (key) => {
        const raw = await env.EMAIL_TO_RSS_KV.get(key.name);
        try {
          return raw ? (JSON.parse(raw) as Article) : null;
        } catch (e) {
          return null;
        }
      })
    )
  ).filter((article) => article !== null);

  const feedArticles = [...articles, ...newArticles];

  const key = getFeedKey(emailHash);
  console.log("write feed key", key);
  await env.EMAIL_TO_RSS_KV.put(key, JSON.stringify(feedArticles));

  return feedArticles;
};

export const getFeedArticles = async (env: Env, email: string) => {
  const emailHash = await hashEmail(email);
  const key = getFeedKey(emailHash);
  const feedArticles = await env.EMAIL_TO_RSS_KV.get(key);

  if (!feedArticles) {
    return [];
  }

  return JSON.parse(feedArticles) as Article[];
};
