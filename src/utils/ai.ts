import { Article } from "../types";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { v7 as uuid7 } from "uuid";

import { streamObject } from "ai";
import { sanitizeHtml } from "./html";

const schema = z.object({
  articles: z.array(
    z.object({
      link: z.string(),
      title: z.string(),
      description: z.string(),
    })
  ),
});

export async function parseNewsletter(
  env: Env,
  source: string,
  body: string
): Promise<Article[]> {
  const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
  const html = sanitizeHtml(body);

  console.log("html", html);

  const model = openai("gpt-4o-mini");
  const prompt = `Extract all articles with links, headlines and short descriptions from this email newsletter. Ignore links like legal that are not part of the main content. Provide the result strictly in JSON format. \n\n${html}`;

  try {
    const result = streamObject({
      model,
      schema,
      prompt,
      onFinish({ usage, object }) {
        console.log("Token usage:", usage);
      },
      onError(error) {
        console.error(error);
      },
    });
    for await (const partialObject of result.partialObjectStream) {
    }

    const articles = (await result.object).articles;

    return articles.map((article) => ({
      id: `${source}:${uuid7()}`,
      url: article.link,
      title: article.title,
      description: article.description,
      createdAt: new Date(),
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}
