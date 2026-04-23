import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/paywall";

export async function requirePaidApiAccess(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!verifyAccessToken(token)) {
    return NextResponse.json(
      { error: "Payment required. Complete checkout to access this endpoint." },
      { status: 402 },
    );
  }

  return null;
}
