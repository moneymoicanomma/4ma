import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { rootMetadata, siteStructuredData } from "@/lib/seo";

import "./globals.css";

export const metadata: Metadata = rootMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://p.typekit.net" crossOrigin="anonymous" />
        <link rel="preload" href="https://use.typekit.net/wrq6fdd.css" as="style" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://use.typekit.net/wrq6fdd.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteStructuredData)
          }}
          type="application/ld+json"
        />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
