import type { Metadata } from "next";
import "./kynlo-base.css";
import "./kynlo-tokens.css";
import "./mobile-overrides.css";

export const metadata: Metadata = {
  title: "Kynlo | Your assets have a future",
  description: "Protected succession instructions for Coinbase Tokenized Stocks on Base.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
