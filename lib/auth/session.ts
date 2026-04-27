import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/generated/prisma/enums";

export const sessionCookieName = "pamoon_session";

const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;

interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  expiresAt: number;
}

const getAuthSecret = () => {
  const secret = process.env.AUTH_SECRET;

  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set and at least 32 characters in production.");
  }

  return "pamoon-local-development-secret-change-before-production";
};

const toBase64Url = (value: Buffer | string) =>
  Buffer.from(value)
    .toString("base64url");

const fromBase64Url = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const signPayload = (encodedPayload: string) =>
  createHmac("sha256", getAuthSecret()).update(encodedPayload).digest("base64url");

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export const createSessionToken = (payload: Omit<SessionPayload, "expiresAt">) => {
  const sessionPayload: SessionPayload = {
    ...payload,
    expiresAt: Date.now() + sessionMaxAgeSeconds * 1000,
  };
  const encodedPayload = toBase64Url(JSON.stringify(sessionPayload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
};

export const verifySessionToken = (token: string): SessionPayload | null => {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  if (!safeEqual(signPayload(encodedPayload), signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as Partial<SessionPayload>;

    if (!parsed.userId || !parsed.email || !parsed.role || !parsed.expiresAt) {
      return null;
    }

    if (parsed.expiresAt < Date.now()) {
      return null;
    }

    return {
      userId: parsed.userId,
      email: parsed.email,
      role: parsed.role,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
};

export const setSessionCookie = async (token: string) => {
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  });
};

export const clearSessionCookie = async () => {
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
};

export const readSessionCookie = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  return token ? verifySessionToken(token) : null;
};

export const createCsrfToken = () => randomBytes(16).toString("hex");
