import dotenv from "dotenv";

dotenv.config();

const asBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return String(value).toLowerCase() === "true";
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  apiPrefix: process.env.API_PREFIX ?? "/api",
  auth: {
    tokenSecret: process.env.AUTH_TOKEN_SECRET ?? "shutterisland-dev-secret",
    tokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL_SECONDS ?? 8 * 60 * 60)
  },
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    name: process.env.DB_NAME ?? "shutterisland",
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    ssl: asBool(process.env.DB_SSL, false)
  }
};
