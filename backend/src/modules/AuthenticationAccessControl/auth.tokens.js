import crypto from "crypto";
import { env } from "../../config/env.js";

const base64UrlEncode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

const base64UrlDecode = (value) => JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

const sign = (content) =>
  crypto
    .createHmac("sha256", env.auth.tokenSecret)
    .update(content)
    .digest("base64url");

export const createAuthToken = (payload) => {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + env.auth.tokenTtlSeconds;
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    iat: now,
    exp: expiresAt
  };

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(body)}`;
  return {
    token: `${unsignedToken}.${sign(unsignedToken)}`,
    expiresAt: new Date(expiresAt * 1000).toISOString()
  };
};

export const verifyAuthToken = (token) => {
  const parts = String(token ?? "").split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = sign(unsignedToken);

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  try {
    const payload = base64UrlDecode(encodedPayload);

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};
