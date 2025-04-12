import PostalMime from "postal-mime";
import { hashEmail } from "./utils/email-utils";
import { isSignupConfirmation, parseNewsletter, parseSignup } from "./utils/ai";
import { Article } from "./types";

import { getFeedKey } from "./utils/keys";

export async function processEmail(
  env: Env,
  rawMessage: string | ReadableStream<Uint8Array<ArrayBufferLike>>,
  to?: string | null
): Promise<void> {
  try {
    const parsedEmail = await PostalMime.parse(rawMessage);
    if (!parsedEmail) {
      console.error("[process] Error parsing email");
      return;
    }
    to = parsedEmail.to ? parsedEmail.to[0].address : null;
    console.log("[process] to", to);
    if (!to) {
      console.error("[process] No recipient address found in the email.");
      return;
    }
    // TODO: figure out a way to remember that we've already subscribed
    const isSignup = await isSignupConfirmation(
      env,
      parsedEmail?.subject || ""
    );
    console.log("[process] subject", parsedEmail?.subject);
    console.log("[process] isSignup", isSignup);

    if (isSignup) {
      await processSignup(env, parsedEmail.html || parsedEmail.text || "");
      return;
    }

    await processHtmlNewsletter(
      env,
      to,
      parsedEmail.html || parsedEmail.text || "",
      parsedEmail?.subject || parsedEmail.from.address || "unknown"
    );

    console.log("[process] Processed email for:", to);
  } catch (e) {
    console.error("[process] Error parsing newsletter:", e);
  }
}

export const processSignup = async (env: Env, body: string) => {
  const signupUrl = await parseSignup(env, body || "");
  console.log("[process] Signup URL:", signupUrl);
  if (signupUrl) {
    const res = await fetch(signupUrl);
    if (res.ok) {
      console.log("[process] successfully signed up");
    } else {
      console.log("[process] Signup URL response error:", res.statusText);
    }
  }
};

export const processHtmlNewsletter = async (
  env: Env,
  email: string,
  html: string,
  source: string
) => {
  const emailHash = await hashEmail(email);
  const newsletterArticles = await parseContent(env, emailHash, html, source);
  const feedArticles = await buildFeedArticles(
    env,
    emailHash,
    newsletterArticles
  );
  return feedArticles;
};

const parseContent = async (
  env: Env,
  emailHash: string,
  content: string,
  source: string
) => {
  const articles = await parseNewsletter(env, emailHash, content, source);

  for (const article of articles) {
    await env.EMAIL_TO_RSS_KV.put(article.id, JSON.stringify(article));
  }

  return articles;
};

export const buildFeedArticles = async (
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

  const feedArticles = [...articles, ...newArticles].reduce((acc, article) => {
    if (!acc.find((a) => a.id === article.id)) {
      acc.push(article);
    }
    return acc;
  }, [] as Article[]);

  const key = getFeedKey(emailHash);
  await env.EMAIL_TO_RSS_KV.put(key, JSON.stringify(feedArticles));

  return feedArticles;
};

export const getFeedArticles = async (
  env: Env,
  email: string,
  rebuild?: boolean
) => {
  const emailHash = await hashEmail(email);
  const key = getFeedKey(emailHash);

  if (rebuild) {
    return await buildFeedArticles(env, emailHash, []);
  }

  const feedArticles = await env.EMAIL_TO_RSS_KV.get(key);

  if (!feedArticles) {
    return [];
  }

  return JSON.parse(feedArticles) as Article[];
};
