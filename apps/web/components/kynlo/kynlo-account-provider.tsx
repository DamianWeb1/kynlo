"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { createContext, useContext } from "react";
import { baseSepolia } from "viem/chains";

const KynloAccountContext = createContext({ configured: false });

export function KynloAccountProvider({ children, appId }: { children: React.ReactNode; appId: string }) {
  if (!appId) {
    return <KynloAccountContext.Provider value={{ configured: false }}>{children}</KynloAccountContext.Provider>;
  }

  return <PrivyProvider appId={appId} config={{
    loginMethods: ["email", "wallet"],
    supportedChains: [baseSepolia],
    defaultChain: baseSepolia,
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
