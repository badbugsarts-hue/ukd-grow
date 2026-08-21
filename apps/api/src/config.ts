export interface ApiConfig {
  host: string;
  port: number;
  databaseUrl: string;
  publicAppUrl: string;
  sessionCookieName: string;
  sessionTtlDays: number;
  magicLinkTtlMinutes: number;
  environment: "development" | "test" | "production";
}

export function loadConfig(env = process.env): ApiConfig {
  const environment =
    env.NODE_ENV === "production" || env.NODE_ENV === "test"
      ? env.NODE_ENV
      : "development";
  return {
    host: env.UKD_API_HOST ?? "0.0.0.0",
    port: Number(env.UKD_API_PORT ?? 3000),
    databaseUrl: env.DATABASE_URL ?? "postgres://ukd:ukd@127.0.0.1:5432/ukd",
    publicAppUrl: env.UKD_PUBLIC_APP_URL ?? "http://127.0.0.1:4173",
    sessionCookieName: "ukd_session",
    sessionTtlDays: 30,
    magicLinkTtlMinutes: 15,
    environment,
  };
}
