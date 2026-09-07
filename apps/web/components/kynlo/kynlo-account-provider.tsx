"use client";

import { PrivyProvider, dataSuffix } from "@privy-io/react-auth";
import { createContext, useContext } from "react";
import { baseSepolia } from "viem/chains";

const KynloAccountContext = createContext({ configured: false });

// ERC-8021 schema 0 suffix for Kynlo's registered Base Builder Code: bc_gki6kw32.
// Appending this suffix attributes Privy-powered Base transactions to Kynlo without
// changing the Kynlo contracts or their ABI.
const KYNLO_BUILDER_CODE_SUFFIX = "0x62635f676b69366b7733320b0080218021802180218021802180218021" as const;

export function KynloAccountProvider({ children, appId }: { children: React.ReactNode; appId: string }) {
  if (!appId) {
    return <KynloAccountContext.Provider value={{ configured: false }}>{children}</KynloAccountContext.Provider>;
  }

  return <PrivyProvider appId={appId} config={{
    loginMethods: ["email", "wallet"],
    supportedChains: [baseSepolia],
    defaultChain: baseSepolia,
    plugins: [dataSuffix(KYNLO_BUILDER_CODE_SUFFIX)],
    appearance: {
      theme: "#f2eee4",
      accentColor: "#11110f",
      landingHeader: "Enter Kynlo",
      loginMessage: "Continue with email or your wallet.",
    },
    embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
  }}>
    <KynloAccountContext.Provider value={{ configured: true }}>{children}</KynloAccountContext.Provider>
  </PrivyProvider>;
}

export function useKynloAccountConfiguration() {
  return useContext(KynloAccountContext);
}
