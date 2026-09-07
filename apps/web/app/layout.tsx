import type { Metadata } from "next";
import "./kynlo-base.css";
import "./kynlo-tokens.css";
import "./mobile-overrides.css";
import { KynloAccountProvider } from "@/components/kynlo/kynlo-account-provider";

export const metadata: Metadata = {
  title: "Kynlo | Your assets have a future",
  description: "Create a protected succession plan for onchain assets using Proof of Life and assigned Successors.",
  other: {
    "base:app_id": "6a9e53cf5538a47d1b071b75",
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
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ?? "";

  return (
    <html lang="en">
      <body className="antialiased"><KynloAccountProvider appId={privyAppId}>{children}</KynloAccountProvider></body>
    </html>
  );
}
