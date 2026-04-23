import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://startupmetricsalerter.com"),
  title: "Startup Metrics Alerter | Get alerts when startup KPIs drop",
  description:
    "Connect Google Analytics and Mixpanel, detect KPI anomalies, and receive alerts before growth stalls.",
  openGraph: {
    title: "Startup Metrics Alerter",
    description:
      "Smart KPI monitoring for startup founders. Get notified when sessions, signups, activation, or revenue trends decline.",
    url: "https://startupmetricsalerter.com",
    siteName: "Startup Metrics Alerter",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Startup Metrics Alerter",
    description:
      "Detect metric drops early with anomaly alerts for Google Analytics and Mixpanel.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
