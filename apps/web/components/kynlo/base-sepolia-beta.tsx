"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "./base-sepolia-beta.css";

const BASE_SEPOLIA_CHAIN_ID = "0x14a34";
const BASE_SEPOLIA = {
  chainId: BASE_SEPOLIA_CHAIN_ID,
  chainName: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
};

export const KYNLO_BASE_SEPOLIA = {
  registry: "0x17464F19349d6a3A72b48b3d664fEc7C4a4Bc528",
  vault: "0xff5284D7c47beF6D1fC1480d03CEF47d0d1c4CC0",
  mockAsset: "0x405ce45BcA33D84D9754e955726b4A6be0b76947",
} as const;

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

async function hasCode(provider: EthereumProvider, address: string) {
  const code = await provider.request({ method: "eth_getCode", params: [address, "latest"] });
  return typeof code === "string" && code !== "0x" && code !== "0x0";
}

export function BaseSepoliaBeta() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [checking, setChecking] = useState(false);
  const [contractsLive, setContractsLive] = useState<boolean | null>(null);
  const [message, setMessage] = useState("Connect a wallet to enter the live Base Sepolia beta.");

  const provider = useMemo(() => (typeof window === "undefined" ? undefined : window.ethereum), []);
  const onBaseSepolia = chainId.toLowerCase() === BASE_SEPOLIA_CHAIN_ID;

  const sync = useCallback(async () => {
    if (!provider) return;
    const [accounts, currentChain] = await Promise.all([
      provider.request({ method: "eth_accounts" }),
      provider.request({ method: "eth_chainId" }),
    ]);
    const list = Array.isArray(accounts) ? accounts : [];
    setAccount(typeof list[0] === "string" ? list[0] : "");
    setChainId(typeof currentChain === "string" ? currentChain : "");
  }, [provider]);

  useEffect(() => {
    void sync();
    if (!provider?.on) return;
    const changed = () => void sync();
    provider.on("accountsChanged", changed);
    provider.on("chainChanged", changed);
    return () => {
      provider.removeListener?.("accountsChanged", changed);
      provider.removeListener?.("chainChanged", changed);
    };
  }, [provider, sync]);

  useEffect(() => {
    if (!provider || !onBaseSepolia) {
      setContractsLive(null);
      return;
    }
    let active = true;
    setChecking(true);
    Promise.all([
      hasCode(provider, KYNLO_BASE_SEPOLIA.registry),
      hasCode(provider, KYNLO_BASE_SEPOLIA.vault),
      hasCode(provider, KYNLO_BASE_SEPOLIA.mockAsset),
    ])
      .then((values) => {
        if (!active) return;
        const live = values.every(Boolean);
        setContractsLive(live);
        setMessage(live ? "Canonical Kynlo staging contracts are live and reachable." : "Could not verify every staging contract from this wallet provider.");
      })
      .catch(() => {
        if (active) {
          setContractsLive(false);
          setMessage("Contract verification failed. Check the wallet RPC and try again.");
        }
      })
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, [provider, onBaseSepolia]);

  const connect = async () => {
    if (!provider) {
      setMessage("No injected wallet found. Install or enable MetaMask in this browser.");
      return;
    }
    try {
      await provider.request({ method: "eth_requestAccounts" });
      await sync();
      setMessage("Wallet connected.");
    } catch {
      setMessage("Wallet connection was cancelled.");
    }
  };

  const switchNetwork = async () => {
    if (!provider) return;
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }] });
    } catch {
      try {
        await provider.request({ method: "wallet_addEthereumChain", params: [BASE_SEPOLIA] });
      } catch {
        setMessage("Base Sepolia network switch was cancelled.");
      }
    }
    await sync();
  };

  return (
    <section className="beta-console" id="beta" aria-label="Kynlo Base Sepolia beta">
      <div className="beta-heading">
        <p className="eyebrow">LIVE STAGING · BASE SEPOLIA</p>
        <h2>Operate the real Kynlo contracts.</h2>
        <p>This console is wired to the canonical Sepolia Registry, Vault and MOCK-B20 deployment. Mainnet remains disabled.</p>
      </div>

      <div className="beta-panel">
        <div className="beta-status-row">
          <span className={`beta-dot ${onBaseSepolia && contractsLive ? "is-live" : ""}`} />
          <div><small>NETWORK</small><strong>{onBaseSepolia ? "BASE SEPOLIA" : chainId ? "WRONG NETWORK" : "NOT CONNECTED"}</strong></div>
          <div><small>CONTRACTS</small><strong>{checking ? "CHECKING" : contractsLive === true ? "LIVE" : contractsLive === false ? "UNVERIFIED" : "WAITING"}</strong></div>
        </div>

        <div className="beta-addresses">
          <a href={`https://sepolia.basescan.org/address/${KYNLO_BASE_SEPOLIA.registry}`} target="_blank" rel="noreferrer"><small>REGISTRY</small><span>{short(KYNLO_BASE_SEPOLIA.registry)}</span></a>
          <a href={`https://sepolia.basescan.org/address/${KYNLO_BASE_SEPOLIA.vault}`} target="_blank" rel="noreferrer"><small>VAULT</small><span>{short(KYNLO_BASE_SEPOLIA.vault)}</span></a>
          <a href={`https://sepolia.basescan.org/address/${KYNLO_BASE_SEPOLIA.mockAsset}`} target="_blank" rel="noreferrer"><small>MOCK-B20</small><span>{short(KYNLO_BASE_SEPOLIA.mockAsset)}</span></a>
        </div>

        <p className="beta-message">{message}</p>
        <div className="beta-actions">
          {!account ? <button onClick={connect}>CONNECT METAMASK</button> : <span className="beta-wallet">{short(account)}</span>}
          {account && !onBaseSepolia ? <button onClick={switchNetwork}>SWITCH TO BASE SEPOLIA</button> : null}
          {account && onBaseSepolia && contractsLive ? <a href="#beta-flow">BEGIN LEGACY PLAN FLOW ↓</a> : null}
        </div>
      </div>

      <div className="beta-flow" id="beta-flow">
        <div><span>01</span><strong>Create Legacy Plan</strong><small>Owner sets Successors and protected timing.</small></div>
        <div><span>02</span><strong>Deposit MOCK-B20</strong><small>Approve and deposit the staging asset into the Vault.</small></div>
        <div><span>03</span><strong>Successors accept</strong><small>Each exact receiving wallet accepts its allocation.</small></div>
        <div><span>04</span><strong>Seal + Proof of Life</strong><small>Arm the plan and keep ownership active onchain.</small></div>
      </div>
    </section>
  );
}
