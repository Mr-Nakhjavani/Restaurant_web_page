import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/jost/300.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL ?? "http://localhost:3000"),
  title: { default: "Bayt Al Ghaf — Emirati Kitchen & Majlis, Al Seef Dubai", template: "%s · Bayt Al Ghaf" },
  description:
    "Bayt Al Ghaf is a (fictional) contemporary Emirati restaurant and majlis on Dubai Creek: machboos, harees, luqaimat and gahwa, with reservations, pickup and delivery.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#2b1a11",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AE">
      <body className="min-h-screen bg-sand-50 text-ink antialiased">{children}</body>
    </html>
  );
}
