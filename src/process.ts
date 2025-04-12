import PostalMime from "postal-mime";
import { hashEmail } from "./utils/email-utils";
import { isSignupConfirmation, parseNewsletter, parseSignup } from "./utils/ai";
import { Article } from "./types";

import { getFeedKey } from "./utils/keys";

// Define interface for database row results
interface ArticleRow {
  id: string;
  email_hash: string;
  url: string;
  title: string;
  description: string;
  created_at: string;
  source: string | null;
}

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
      parsedEmail.from.name || parsedEmail?.subject || "unknown"
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
  const newsletterArticles = await parseNewsletter(
    env,
    emailHash,
    html,
    source
  );
  return await saveFeedArticles(env, emailHash, newsletterArticles);
};

export const saveFeedArticles = async (
  env: Env,
  emailHash: string,
  articles: Article[]
) => {
  const stmt = env.EMAIL_TO_RSS_DB.prepare(
    "INSERT INTO articles (id, email_hash, url, title, description, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  const batch = articles.map((article) => {
    return stmt.bind(
      article.id,
      emailHash,
      article.url,
      article.title,
      article.description,
      article.createdAt.toISOString(),
      article.source || null
    );
  });

  if (batch.length > 0) {
    await env.EMAIL_TO_RSS_DB.batch(batch);
  }

  return articles;
};

export const getFeedArticles = async (env: Env, email: string) => {
  const emailHash = await hashEmail(email);

  const { results } = await env.EMAIL_TO_RSS_DB.prepare(
    "SELECT * FROM articles WHERE email_hash = ? ORDER BY created_at DESC LIMIT 100"
  )
    .bind(emailHash)
    .all<ArticleRow>();

  if (!results || results.length === 0) {
    return [];
  }

  const feedArticles: Article[] = results.map((row) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    createdAt: new Date(row.created_at),
    source: row.source || undefined,
  }));

  return feedArticles;
};
