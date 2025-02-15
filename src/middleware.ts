import { MiddlewareHandler } from "hono";
import { getConfig, validateConfig } from "./utils/config";

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (
  c,
  next
) => {
  const config = getConfig(c.env);
  validateConfig(config);

  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    c.header("WWW-Authenticate", 'Basic realm="Restricted"');
    return c.text("Unauthorized", 401);
  }

  const credentials = atob(authHeader.slice(6));
  const [username, password] = credentials.split(":");

  if (username !== config.AUTH_USERNAME || password !== config.AUTH_PASSWORD) {
    return c.text("Unauthorized", 401);
  }

  await next();
};
