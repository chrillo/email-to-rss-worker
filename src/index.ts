// Import Hono for HTTP routing.
import { Hono } from "hono";

import { getFeedArticles, processEmail, processHtml } from "./process";

import { hashEmail } from "./utils/email-utils";
import { getFeedKey } from "./utils/keys";
import { renderRss } from "./utils/rss";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  return c.text("Hello, world!");
});

app.get("/rss", async (c) => {
  const email = c.req.query("email");
  if (!email) return c.text("Missing email parameter", 400);

  const emailHash = await hashEmail(email);
  const key = getFeedKey(emailHash);
  console.log("read feed key", key);

  const feedArticles = await getFeedArticles(c.env, email);
  const rss = renderRss(emailHash, feedArticles);

  return c.body(rss, 200, { "Content-Type": "application/rss+xml" });
});
app.get("/items", async (c) => {
  const email = c.req.query("email");
  if (!email) return c.text("Missing email parameter", 400);

  const emailHash = await hashEmail(email);
  const key = getFeedKey(emailHash);
  console.log("read feed key", key);

  const feedArticles = await getFeedArticles(c.env, email);
  return c.json(feedArticles);
});
app.post("/process-html", async (c) => {
  const body = await c.req.text();
  const email = "read@chrillo.at";
  const feedArticles = await processHtml(c.env, email, body);
  const rss = renderRss(email, feedArticles);
  return c.body(rss, 200, {
    "Content-Type": "application/rss+xml",
  });
});

app.all("*", (c) => c.text("Not Found", 404));

export default {
  fetch: app.fetch,

  email: (
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext
  ) => {
    console.log("processing email");
    console.log("email event handler", message);
    // Use waitUntil() to ensure asynchronous processing completes.
    ctx.waitUntil(processEmail(message, env));
  },
};
