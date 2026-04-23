"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CheckoutSessionActivator() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [manualSessionId, setManualSessionId] = useState("");
  const sessionIdFromUrl = useMemo(() => searchParams.get("session_id"), [searchParams]);

  useEffect(() => {
    if (!sessionIdFromUrl) {
      return;
    }

    let isCancelled = false;

    async function activateAccess(): Promise<void> {
      setStatus("Verifying payment and unlocking dashboard access...");

      try {
        const response = await fetch("/api/paywall/activate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: sessionIdFromUrl }),
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Could not verify session.");
        }

        if (!isCancelled) {
          setStatus("Access unlocked. Redirecting to your KPI dashboard...");
          router.replace("/dashboard");
        }
      } catch (error) {
        if (!isCancelled) {
          setStatus(
            error instanceof Error
              ? error.message
              : "Payment verification failed.",
          );
        }
      }
    }

    void activateAccess();

    return () => {
      isCancelled = true;
    };
  }, [router, sessionIdFromUrl]);

  async function activateManually(): Promise<void> {
    if (!manualSessionId.trim()) {
      setStatus("Enter a Stripe checkout session ID to unlock access.");
      return;
    }

    setStatus("Verifying session ID...");

    try {
      const response = await fetch("/api/paywall/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: manualSessionId.trim() }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to unlock access.");
      }

      setStatus("Access unlocked. Redirecting...");
      router.push("/dashboard");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to unlock access.",
      );
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <p className="text-sm font-medium text-slate-200">Already purchased?</p>
      <p className="text-sm text-slate-400">
        If checkout redirected with a `session_id`, access unlocks automatically. You can also paste the session ID manually.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={manualSessionId}
          onChange={(event) => setManualSessionId(event.target.value)}
          placeholder="cs_test_..."
        />
        <Button onClick={activateManually} type="button">
          Unlock Dashboard
        </Button>
      </div>
      {status ? <p className="text-sm text-slate-300">{status}</p> : null}
    </div>
  );
}
