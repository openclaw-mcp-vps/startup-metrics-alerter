import { createHmac, timingSafeEqual } from "crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME } from "@/lib/constants";

const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface AccessPayload {
  email: string;
  sessionId: string;
  iat: number;
  exp: number;
}

function getPaywallSecret() {
  return (
    process.env.ACCESS_COOKIE_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "dev-only-secret-change-in-production"
  );
}

function signPayload(payloadBase64: string) {
  return createHmac("sha256", getPaywallSecret()).update(payloadBase64).digest("base64url");
}

function serializePayload(payload: AccessPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parsePayload(token: string): AccessPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);

  if (expectedSignature.length !== signature.length) {
    return null;
  }

  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as AccessPayload;

    if (!payload.email || !payload.sessionId || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function issueAccessCookie(response: NextResponse, email: string, sessionId: string) {
  const now = Date.now();
  const token = serializePayload({
    email,
    sessionId,
    iat: now,
    exp: now + ACCESS_COOKIE_MAX_AGE_SECONDS * 1000,
  });

  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}

export function clearAccessCookie(response: NextResponse) {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });
}

export async function getAccessPayloadFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return parsePayload(token);
}

export async function hasPaywallAccess() {
  const payload = await getAccessPayloadFromCookies();
  return Boolean(payload);
}

export function hasPaywallAccessFromRawToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  return Boolean(parsePayload(token));
}
