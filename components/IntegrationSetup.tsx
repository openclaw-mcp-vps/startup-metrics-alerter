"use client";

import { useMemo, useState } from "react";

import type { Integration, IntegrationProvider } from "@/lib/types";

interface IntegrationSetupProps {
  initialIntegrations: Integration[];
}

const providerExamples: Record<IntegrationProvider, string> = {
  "google-analytics": JSON.stringify(
    {
      propertyId: "123456789",
      serviceAccountJson: "{...full service account JSON...}",
      signupsMetric: "newUsers",
      activationRateMetric: "engagementRate",
      trialToPaidMetric: "purchaseToViewRate",
      mrrMetric: "purchaseRevenue",
    },
    null,
    2,
  ),
  mixpanel: JSON.stringify(
    {
      serviceAccountUsername: "service-account",
      serviceAccountSecret: "mp_secret",
      signupsEvent: "Signed Up",
      activationEvent: "Workspace Activated",
      trialToPaidEvent: "Subscribed",
      mrrEvent: "Recurring Revenue Updated",
      churnEvent: "Subscription Canceled",
    },
    null,
    2,
  ),
};

export function IntegrationSetup({ initialIntegrations }: IntegrationSetupProps) {
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);
  const [provider, setProvider] = useState<IntegrationProvider>("google-analytics");
  const [name, setName] = useState("Primary analytics source");
  const [configText, setConfigText] = useState(providerExamples["google-analytics"]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const providerHint = useMemo(() => providerExamples[provider], [provider]);

  const refreshIntegrations = async () => {
    const response = await fetch("/api/integrations", { cache: "no-store" });
    const payload = (await response.json()) as { integrations?: Integration[]; error?: string };

    if (!response.ok || !payload.integrations) {
      setStatus(payload.error ?? "Failed to refresh integrations.");
      return;
    }

    setIntegrations(payload.integrations);
  };

  const createIntegration = async () => {
    setLoading(true);
    setStatus("Saving integration...");

    let parsedConfig: Record<string, string>;

    try {
      parsedConfig = JSON.parse(configText) as Record<string, string>;
    } catch {
      setLoading(false);
      setStatus("Config JSON is invalid.");
      return;
    }

    const response = await fetch("/api/integrations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "create",
        provider,
        name,
        config: parsedConfig,
      }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setLoading(false);
      setStatus(payload.error ?? "Failed to save integration.");
      return;
    }

    await refreshIntegrations();
    setLoading(false);
    setStatus("Integration saved.");
  };

  const toggleIntegration = async (id: string, enabled: boolean) => {
    setLoading(true);

    await fetch("/api/integrations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "toggle",
        id,
        enabled,
      }),
    });

    await refreshIntegrations();
    setLoading(false);
  };

  const deleteIntegration = async (id: string) => {
    setLoading(true);

    await fetch("/api/integrations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "delete",
        id,
      }),
    });

    await refreshIntegrations();
    setLoading(false);
  };

  return (
    <section className="rounded-2xl border border-[#30363d] bg-[#161b22]/70 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#f0f6fc]">Data Integrations</h2>
        <p className="mt-1 text-sm text-[#8b949e]">
          Connect Google Analytics or Mixpanel to pull KPI history automatically.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-[#c9d1d9]">
          <span>Provider</span>
          <select
            value={provider}
            onChange={(event) => {
              const value = event.target.value as IntegrationProvider;
              setProvider(value);
              setConfigText(providerExamples[value]);
            }}
            className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#58a6ff]"
          >
            <option value="google-analytics">Google Analytics 4</option>
            <option value="mixpanel">Mixpanel</option>
          </select>
        </label>

        <label className="space-y-2 text-sm text-[#c9d1d9]">
          <span>Connection name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#58a6ff]"
          />
        </label>
      </div>

      <label className="mt-4 block space-y-2 text-sm text-[#c9d1d9]">
        <span>Config JSON</span>
        <textarea
          value={configText}
          onChange={(event) => setConfigText(event.target.value)}
          className="min-h-[180px] w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-xs font-medium text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
          spellCheck={false}
        />
      </label>

      <p className="mt-2 text-xs text-[#8b949e]">
        Example for {provider}: <span className="font-mono">{providerHint.slice(0, 80)}...</span>
      </p>

      <button
        type="button"
        disabled={loading}
        onClick={createIntegration}
        className="mt-4 rounded-xl bg-[#1f6feb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#388bfd] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Save integration
      </button>

      <p className="mt-2 text-xs text-[#8b949e]">{status}</p>

      <div className="mt-6 space-y-3">
        {integrations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#30363d] bg-[#0d1117] p-4 text-sm text-[#8b949e]">
            No integrations configured yet.
          </div>
        ) : (
          integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex flex-col gap-3 rounded-xl border border-[#30363d] bg-[#0d1117] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-[#f0f6fc]">{integration.name}</p>
                <p className="text-xs text-[#8b949e]">
                  {integration.provider} • {integration.enabled ? "enabled" : "paused"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleIntegration(integration.id, !integration.enabled)}
                  className="rounded-lg border border-[#58a6ff] px-3 py-1.5 text-xs font-semibold text-[#79c0ff]"
                >
                  {integration.enabled ? "Pause" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteIntegration(integration.id)}
                  className="rounded-lg border border-[#ff7b72] px-3 py-1.5 text-xs font-semibold text-[#ff7b72]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
