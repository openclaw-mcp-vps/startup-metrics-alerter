import crypto from "node:crypto";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const ACCESS_COOKIE_NAME = "startup_metrics_access";
const ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  return (
    process.env.PAYWALL_COOKIE_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    "development-cookie-secret-change-me"
  );
}

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createAccessToken(sessionId: string): string {
  const issuedAt = Date.now().toString();
  const payload = `${sessionId}.${issuedAt}`;
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function verifyAccessToken(token?: string): boolean {
  if (!token) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length < 3) {
    return false;
  }

  const signature = parts.pop();
  const payload = parts.join(".");

  if (!signature) {
    return false;
  }

  const expected = signPayload(payload);
  if (!safeEqual(signature, expected)) {
    return false;
  }

  const issuedAt = Number(parts[parts.length - 1]);
  if (Number.isNaN(issuedAt)) {
    return false;
  }

  const ageSeconds = Math.floor((Date.now() - issuedAt) / 1000);
  return ageSeconds >= 0 && ageSeconds <= ACCESS_MAX_AGE_SECONDS;
}

export async function hasPaidAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  return verifyAccessToken(token);
}

export function setPaidAccessCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: createAccessToken(sessionId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });
}
