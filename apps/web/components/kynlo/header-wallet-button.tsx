"use client";

import { useEffect, useState } from "react";

const BASE_SEPOLIA_CHAIN_ID = "0x14a34";

type Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

declare global { interface Window { ethereum?: Provider } }

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function HeaderWalletButton() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    const sync = async () => {
      const [accounts, chain] = await Promise.all([
        provider.request({ method: "eth_accounts" }),
        provider.request({ method: "eth_chainId" }),
      ]);
      const list = Array.isArray(accounts) ? accounts : [];
      setAccount(typeof list[0] === "string" ? list[0] : "");
      setChainId(typeof chain === "string" ? chain : "");
    };
    void sync();
    const changed = () => void sync();
    provider.on?.("accountsChanged", changed);
    provider.on?.("chainChanged", changed);
    return () => {
      provider.removeListener?.("accountsChanged", changed);
      provider.removeListener?.("chainChanged", changed);
    };
  }, []);

  const connect = async () => {
    const provider = window.ethereum;
    if (!provider) {
      window.location.hash = "beta";
      return;
    }
    await provider.request({ method: "eth_requestAccounts" });
    const chain = await provider.request({ method: "eth_chainId" });
    if (chain !== BASE_SEPOLIA_CHAIN_ID) {
      try {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }] });
      } catch {
        window.location.hash = "beta";
      }
    }
    const accounts = await provider.request({ method: "eth_accounts" });
    const list = Array.isArray(accounts) ? accounts : [];
    setAccount(typeof list[0] === "string" ? list[0] : "");
    setChainId(typeof chain === "string" ? chain : "");
  };

  return <button className="header-wallet" onClick={connect}>
    <span className={chainId === BASE_SEPOLIA_CHAIN_ID && account ? "wallet-live" : ""} />
    {account ? short(account) : "CONNECT WALLET"}
  </button>;
}
