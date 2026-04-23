import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME } from "@/lib/constants";
import { hasPaywallAccessFromRawToken } from "@/lib/paywall";

export function ensurePaidAccess(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;

  if (!hasPaywallAccessFromRawToken(token)) {
    return NextResponse.json(
      { error: "Paid access required. Complete checkout to unlock this endpoint." },
      { status: 402 },
    );
  }

  return null;
}
