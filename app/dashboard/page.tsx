import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/DashboardClient";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/paywall";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const hasAccess = verifyAccessToken(
    cookieStore.get(ACCESS_COOKIE_NAME)?.value,
  );

  if (!hasAccess) {
    redirect("/?paywall=locked");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <DashboardClient />
    </main>
  );
}
