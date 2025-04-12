import { Article } from "../types";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { v7 as uuid7 } from "uuid";

import { streamObject } from "ai";
import { sanitizeHtml } from "./html";

const articlesSchema = z.object({
  articles: z.array(
    z.object({
      link: z.string(),
      title: z.string(),
      description: z.string(),
    })
  ),
});

const confirmationSchema = z.object({
  url: z.string(),
});

const isSignupConfirmationSchema = z.object({
  signup: z.boolean(),
});

export async function isSignupConfirmation(env: Env, subject: string) {
  const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
  const model = openai("gpt-4o-mini");

  const prompt = `Determine if the email is a signup confirmation based on the subject. return your answer in json format as either {signup:true} or {signup:false}. \n\n${subject}`;

  try {
    const result = streamObject({
      model,
      schema: isSignupConfirmationSchema,
      prompt,
      onFinish({ usage, object }) {},
      onError(error) {
        console.error(error);
      },
    });
    for await (const partialObject of result.partialObjectStream) {
    }

    return (await result.object).signup;
  } catch (error) {
    console.log("[ai] signup confirmation error", error);
    return false;
  }
}

export async function parseSignup(env: Env, body: string) {
  const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
  const model = openai("gpt-4o-mini");
  const html = sanitizeHtml(body);

  const prompt = `Extract the subscription confirmation link from this email message. Return only the url.  \n\n${html}`;

  try {
    const result = streamObject({
      model,
      schema: confirmationSchema,
      prompt,
      onFinish({ usage, object }) {},
      onError(error) {
        console.error(error);
      },
    });
    for await (const partialObject of result.partialObjectStream) {
    }

    const confirmationUrl = (await result.object).url;

    console.log("[ai] Confirmation URL:", confirmationUrl);
    return confirmationUrl;
  } catch (error) {
    console.log(error);
    return null;
  }
}
export async function parseNewsletter(
  env: Env,
  idPrefix: string,
  body: string,
  source: string
): Promise<Article[]> {
  const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
  const model = openai("gpt-4o-mini");
  const html = sanitizeHtml(body);

  console.log("[ai] parse html", html);

  const prompt = `Extract all articles with links, headlines and short descriptions from this email newsletter. Ignore links like legal that are not part of the main content. Provide the result strictly in JSON format. \n\n${html}`;

  try {
    const result = streamObject({
      model,
      schema: articlesSchema,
      prompt,
      onFinish({ usage, object }) {},
      onError(error) {
        console.error(error);
      },
    });
    for await (const partialObject of result.partialObjectStream) {
    }

    const articles = (await result.object).articles;
    console.log("[ai] parsed articles", articles.length);
    return articles.map((article) => ({
      id: `${idPrefix}:${uuid7()}`,
      url: article.link,
      title: article.title,
      description: article.description,
      createdAt: new Date(),
      source,
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}
