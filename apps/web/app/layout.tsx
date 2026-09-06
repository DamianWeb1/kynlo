import type { Metadata } from "next";
import "./kynlo-base.css";
import "./kynlo-tokens.css";
import "./mobile-overrides.css";
import { KynloAccountProvider } from "@/components/kynlo/kynlo-account-provider";

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
  const cdpProjectId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID?.trim() ?? "";

  return (
    <html lang="en">
      <body className="antialiased"><KynloAccountProvider projectId={cdpProjectId}>{children}</KynloAccountProvider></body>
    </html>
  );
}
