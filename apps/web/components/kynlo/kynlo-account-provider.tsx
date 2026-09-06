"use client";

import { CDPReactProvider } from "@coinbase/cdp-react";
import { createContext, useContext } from "react";

const KynloAccountContext = createContext({ configured: false });

export function KynloAccountProvider({ children, projectId }: { children: React.ReactNode; projectId: string }) {
  if (!projectId) {
    return <KynloAccountContext.Provider value={{ configured: false }}>{children}</KynloAccountContext.Provider>;
  }

  return <CDPReactProvider config={{ projectId, appName: "Kynlo", authMethods: ["email", "siwe:base"], ethereum: { createOnLogin: "smart" } }}>
    <KynloAccountContext.Provider value={{ configured: true }}>{children}</KynloAccountContext.Provider>
  </CDPReactProvider>;
}

export function useKynloAccountConfiguration() {
  return useContext(KynloAccountContext);
}
