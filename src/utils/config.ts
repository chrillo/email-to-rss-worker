export interface Config {
  AUTH_USERNAME: string;
  AUTH_PASSWORD: string;
}

export function getConfig(env: Env): Config {
  return {
    AUTH_USERNAME: env.AUTH_USERNAME || "",
    AUTH_PASSWORD: env.AUTH_PASSWORD || "",
  };
}

export function validateConfig(config: Config): void {
  if (!config.AUTH_USERNAME || !config.AUTH_PASSWORD) {
    throw new Error(
      "Authentication credentials not configured. Please set AUTH_USERNAME and AUTH_PASSWORD environment variables."
    );
  }
}
