"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

async function unlockAccess(payload: { sessionId?: string; email?: string }) {
  const response = await fetch("/api/paywall/unlock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { unlocked?: boolean; error?: string };

  return {
    ok: response.ok && data.unlocked,
    error: data.error,
  };
}

export default function UnlockDashboardPage() {
  const router = useRouter();
  const attemptedAutoUnlock = useRef(false);

  const [sessionId, setSessionId] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(
    "Use your Stripe checkout session ID or purchase email to unlock access.",
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const querySessionId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("session_id")
        : null;

    if (!querySessionId || attemptedAutoUnlock.current) {
      return;
    }

    attemptedAutoUnlock.current = true;
    setSessionId(querySessionId);
    setLoading(true);
    setStatus("Confirming purchase...");

    void unlockAccess({ sessionId: querySessionId }).then((result) => {
      setLoading(false);

      if (result.ok) {
        setStatus("Purchase confirmed. Redirecting to dashboard...");
        router.replace("/dashboard");
        return;
      }

      setStatus(result.error ?? "Could not confirm purchase yet. Try again shortly.");
    });
  }, [router]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sessionId && !email) {
      setStatus("Enter a session ID or your purchase email.");
      return;
    }

    setLoading(true);
    setStatus("Unlocking dashboard...");

    const result = await unlockAccess({
      sessionId: sessionId || undefined,
      email: email || undefined,
    });

    setLoading(false);

    if (!result.ok) {
      setStatus(result.error ?? "Unable to unlock dashboard.");
      return;
    }

    setStatus("Access granted. Redirecting...");
    router.replace("/dashboard");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-12">
      <section className="w-full rounded-3xl border border-[#30363d] bg-[#161b22]/80 p-7 shadow-[0_20px_80px_-30px_rgba(1,4,9,0.8)]">
        <h1 className="text-2xl font-semibold text-[#f0f6fc]">Unlock your dashboard</h1>
        <p className="mt-2 text-sm text-[#8b949e]">
          After checkout, Stripe can redirect here using
          <span className="mx-1 rounded bg-[#0d1117] px-1.5 py-0.5 font-mono text-[#c9d1d9]">
            ?session_id=&#123;CHECKOUT_SESSION_ID&#125;
          </span>
          in your payment link success URL.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block space-y-2 text-sm text-[#c9d1d9]">
            <span>Stripe checkout session ID</span>
            <input
              type="text"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder="cs_test_..."
              className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#58a6ff]"
            />
          </label>

          <label className="block space-y-2 text-sm text-[#c9d1d9]">
            <span>or purchase email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="founder@startup.com"
              className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#58a6ff]"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#1f6feb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#388bfd] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Checking purchase..." : "Unlock dashboard"}
          </button>
        </form>

        <p className="mt-4 text-xs text-[#8b949e]">{status}</p>

        <p className="mt-5 text-sm text-[#8b949e]">
          Need checkout first?{" "}
          <Link href="/" className="font-semibold text-[#79c0ff] hover:underline">
            View pricing
          </Link>
        </p>
      </section>
    </main>
  );
}
