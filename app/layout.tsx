import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Money Moicano MMA",
  description: "Landing page do evento Money Moicano MMA."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/wrq6fdd.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
