import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Startup Metrics Alerter | Get alerts when startup KPIs drop",
  description:
    "Connect Google Analytics and Mixpanel to detect KPI declines early and alert founders before growth stalls.",
  keywords: [
    "startup KPI alerts",
    "founder analytics",
    "metric anomaly detection",
    "SaaS startup monitoring",
    "startup tools",
  ],
  openGraph: {
    title: "Startup Metrics Alerter",
    description:
      "Automated KPI anomaly alerts for founders who need early warning when growth metrics dip.",
    type: "website",
    url: "https://startup-metrics-alerter.com",
    siteName: "Startup Metrics Alerter",
  },
  twitter: {
    card: "summary_large_image",
    title: "Startup Metrics Alerter",
    description:
      "Get alerted when signups, activation, retention, or revenue dip below expected ranges.",
  },
  metadataBase: new URL("https://startup-metrics-alerter.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${plexMono.variable}`}>
      <body className="bg-[#0d1117] text-[#f0f6fc] antialiased">{children}</body>
    </html>
  );
}
