import { Hono } from "hono";
import { authMiddleware } from "./middleware";

import {
  getFeedArticles,
  processEmail,
  processHtmlNewsletter,
} from "./process";

import { hashEmail } from "./utils/email-utils";
import { getFeedKey } from "./utils/keys";
import { renderRss } from "./utils/rss";

const app = new Hono<{ Bindings: Env }>();

// Add authentication to all protected routes
app.use("*", authMiddleware);

app.get("/", (c) => {
  return c.text("email to rss", 200);
});

app.get("/rss", async (c) => {
  const email = c.req.query("email");
  if (!email) return c.text("Missing email parameter", 400);

  const emailHash = await hashEmail(email);
  const key = getFeedKey(emailHash);

  const feedArticles = await getFeedArticles(c.env, email);
  const rss = renderRss(emailHash, feedArticles);

  return c.body(rss, 200, { "Content-Type": "application/rss+xml" });
});
app.get("/items", async (c) => {
  const email = c.req.query("email");
  if (!email) return c.text("Missing email parameter", 400);

  const rebuild = c.req.query("rebuild") === "true";

  const emailHash = await hashEmail(email);
  const key = getFeedKey(emailHash);

  const feedArticles = await getFeedArticles(c.env, email);
  return c.json(feedArticles);
});

app.post("/debug/process-html", async (c) => {
  const body = await c.req.text();
  const email = "read@chrillo.at";
  const feedArticles = await processHtmlNewsletter(c.env, email, body, "test");
  const rss = renderRss(email, feedArticles);
  return c.body(rss, 200, {
    "Content-Type": "application/rss+xml",
  });
});

app.post("/debug/process-email", async (c) => {
  const body = await c.req.text();
  const res = await processEmail(c.env, body);
  return c.text("OK");
});

app.all("*", (c) => c.text("Not Found", 404));

export default {
  fetch: app.fetch,

  email: (
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext
  ) => {
    console.log("[email-handler] processing email");
    console.log("[email-handler] email event handler: ", message.from);
    // Use waitUntil() to ensure asynchronous processing completes.
    ctx.waitUntil(
      processEmail(env, message.raw).then(() => {
        console.log("[email-handler] email processed successfully");
      })
    );
  },
};
