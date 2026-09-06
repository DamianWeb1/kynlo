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

const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function utf8Hex(value: string) {
  return `0x${Array.from(new TextEncoder().encode(value), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function word(value: bigint | number | string) {
  const numeric = typeof value === "bigint" ? value : BigInt(value);
  return numeric.toString(16).padStart(64, "0");
}

function addressWord(address: string) {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

async function selector(provider: EthereumProvider, signature: string) {
  const hash = await provider.request({ method: "web3_sha3", params: [utf8Hex(signature)] });
  if (typeof hash !== "string" || !hash.startsWith("0x") || hash.length < 10) {
    throw new Error("Wallet RPC could not derive a function selector.");
  }
  return hash.slice(2, 10);
}

async function hasCode(provider: EthereumProvider, address: string) {
  const code = await provider.request({ method: "eth_getCode", params: [address, "latest"] });
  return typeof code === "string" && code !== "0x" && code !== "0x0";
}

async function waitForReceipt(provider: EthereumProvider, hash: string) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const receipt = await provider.request({ method: "eth_getTransactionReceipt", params: [hash] });
    if (receipt && typeof receipt === "object") {
      const status = (receipt as { status?: string }).status;
      if (status === "0x0") throw new Error("Transaction reverted on Base Sepolia.");
      return receipt;
    }
    await sleep(1200);
  }
  throw new Error("Transaction was submitted but confirmation timed out.");
}

async function sendData(provider: EthereumProvider, from: string, to: string, data: string) {
  const hash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to, data }] });
  if (typeof hash !== "string") throw new Error("Wallet did not return a transaction hash.");
  await waitForReceipt(provider, hash);
  return hash;
}

function cleanError(error: unknown) {
  if (error instanceof Error) return error.message.replace(/^Error:\s*/i, "");
  return "Transaction was cancelled or failed.";
}

export function BaseSepoliaBeta() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [checking, setChecking] = useState(false);
  const [contractsLive, setContractsLive] = useState<boolean | null>(null);
  const [message, setMessage] = useState("Connect a wallet to enter the live Base Sepolia beta.");
  const [busy, setBusy] = useState("");
  const [successorA, setSuccessorA] = useState("");
  const [successorB, setSuccessorB] = useState("");
  const [rawAmount, setRawAmount] = useState("1000");
  const [planId, setPlanId] = useState("");
  const [lastTx, setLastTx] = useState("");

  const provider = useMemo(() => (typeof window === "undefined" ? undefined : window.ethereum), []);
  const onBaseSepolia = chainId.toLowerCase() === BASE_SEPOLIA_CHAIN_ID;
  const ready = Boolean(account && provider && onBaseSepolia && contractsLive);

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
    const saved = window.localStorage.getItem("kynlo-beta-plan-id");
    if (saved) setPlanId(saved);
  }, []);

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

  const run = async (label: string, action: () => Promise<string | void>) => {
    if (!provider || !account || !ready || busy) return;
    setBusy(label);
    setLastTx("");
    try {
      const tx = await action();
      if (tx) setLastTx(tx);
    } catch (error) {
      setMessage(cleanError(error));
    } finally {
      setBusy("");
    }
  };

  const createPlan = () => run("create", async () => {
    if (!provider) return;
    if (!addressPattern.test(successorA) || !addressPattern.test(successorB)) throw new Error("Enter two valid Successor wallet addresses.");
    if (successorA.toLowerCase() === successorB.toLowerCase()) throw new Error("Successor A and B must be different wallets.");
    if ([successorA, successorB].some((value) => value.toLowerCase() === account.toLowerCase())) throw new Error("The owner cannot also be a Successor.");

    const nextSelector = await selector(provider, "nextPlanId()");
    const next = await provider.request({ method: "eth_call", params: [{ to: KYNLO_BASE_SEPOLIA.vault, data: `0x${nextSelector}` }, "latest"] });
    if (typeof next !== "string") throw new Error("Could not resolve the next Legacy Plan ID.");
    const expectedPlanId = BigInt(next).toString();

    const fn = await selector(provider, "createLegacyPlan((address,uint16)[],uint64,uint64)");
    const head = `${word(96)}${word(90 * 24 * 60 * 60)}${word(30 * 24 * 60 * 60)}`;
    const successors = `${word(2)}${addressWord(successorA)}${word(5000)}${addressWord(successorB)}${word(5000)}`;
    setMessage("Confirm Legacy Plan creation in MetaMask.");
    const tx = await sendData(provider, account, KYNLO_BASE_SEPOLIA.vault, `0x${fn}${head}${successors}`);
    setPlanId(expectedPlanId);
    window.localStorage.setItem("kynlo-beta-plan-id", expectedPlanId);
    setMessage(`Legacy Plan #${expectedPlanId} created. Next approve and deposit MOCK-B20.`);
    return tx;
  });

  const approveAndDeposit = () => run("deposit", async () => {
    if (!provider) return;
    const id = BigInt(planId || "0");
    const amount = BigInt(rawAmount || "0");
    if (id <= 0n) throw new Error("Enter a valid Legacy Plan ID.");
    if (amount <= 0n) throw new Error("Deposit amount must be greater than zero.");

    const approve = await selector(provider, "approve(address,uint256)");
    setMessage("1/2 Confirm MOCK-B20 approval in MetaMask.");
    await sendData(provider, account, KYNLO_BASE_SEPOLIA.mockAsset, `0x${approve}${addressWord(KYNLO_BASE_SEPOLIA.vault)}${word(amount)}`);

    const deposit = await selector(provider, "depositAsset(uint256,address,uint256)");
    setMessage("2/2 Confirm Kynlo Vault deposit in MetaMask.");
    const tx = await sendData(provider, account, KYNLO_BASE_SEPOLIA.vault, `0x${deposit}${word(id)}${addressWord(KYNLO_BASE_SEPOLIA.mockAsset)}${word(amount)}`);
    setMessage(`MOCK-B20 deposited into Legacy Plan #${id}. Switch to each Successor wallet and accept.`);
    return tx;
  });

  const accept = () => run("accept", async () => {
    if (!provider) return;
    const id = BigInt(planId || "0");
    if (id <= 0n) throw new Error("Enter the Legacy Plan ID first.");
    const fn = await selector(provider, "acceptSuccessor(uint256)");
    setMessage("Confirm Successor acceptance in MetaMask.");
    const tx = await sendData(provider, account, KYNLO_BASE_SEPOLIA.vault, `0x${fn}${word(id)}`);
    setMessage(`Wallet ${short(account)} accepted Legacy Plan #${id}.`);
    return tx;
  });

  const seal = () => run("seal", async () => {
    if (!provider) return;
    const id = BigInt(planId || "0");
    if (id <= 0n) throw new Error("Enter the Legacy Plan ID first.");
    const fn = await selector(provider, "armLegacyPlan(uint256)");
    setMessage("Confirm Seal in the owner wallet.");
    const tx = await sendData(provider, account, KYNLO_BASE_SEPOLIA.vault, `0x${fn}${word(id)}`);
    setMessage(`Legacy Plan #${id} is SEALED and active.`);
    return tx;
  });

  const proofOfLife = () => run("checkin", async () => {
    if (!provider) return;
    const id = BigInt(planId || "0");
    if (id <= 0n) throw new Error("Enter the Legacy Plan ID first.");
    const fn = await selector(provider, "checkIn(uint256)");
    setMessage("Confirm Proof of Life in the owner wallet.");
    const tx = await sendData(provider, account, KYNLO_BASE_SEPOLIA.vault, `0x${fn}${word(id)}`);
    setMessage(`Proof of Life recorded for Legacy Plan #${id}.`);
    return tx;
  });

  return (
    <section className="beta-console" id="beta" aria-label="Kynlo Base Sepolia beta">
      <div className="beta-heading">
        <p className="eyebrow">LIVE STAGING · BASE SEPOLIA</p>
        <h2>Operate the real Kynlo contracts.</h2>
        <p>This console executes real testnet transactions against the canonical Registry, Vault and MOCK-B20 deployment. Mainnet remains disabled.</p>
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

        <p className="beta-message">{busy ? `Waiting for ${busy} transaction…` : message}</p>
        <div className="beta-actions">
          {!account ? <button onClick={connect}>CONNECT METAMASK</button> : <span className="beta-wallet">{short(account)}</span>}
          {account && !onBaseSepolia ? <button onClick={switchNetwork}>SWITCH TO BASE SEPOLIA</button> : null}
          {lastTx ? <a href={`https://sepolia.basescan.org/tx/${lastTx}`} target="_blank" rel="noreferrer">VIEW LAST TX ↗</a> : null}
        </div>
      </div>

      <div className="beta-operator" id="beta-flow" aria-disabled={!ready}>
        <article>
          <div className="beta-step"><span>01</span><strong>Create Legacy Plan</strong></div>
          <label>SUCCESSOR A<input value={successorA} onChange={(event) => setSuccessorA(event.target.value.trim())} placeholder="0x…" /></label>
          <label>SUCCESSOR B<input value={successorB} onChange={(event) => setSuccessorB(event.target.value.trim())} placeholder="0x…" /></label>
          <p>Staging allocation is fixed at 50% / 50%. Timing is the production minimum: 90 days + 30 days.</p>
          <button disabled={!ready || Boolean(busy)} onClick={createPlan}>{busy === "create" ? "CREATING…" : "CREATE PLAN"}</button>
        </article>

        <article>
          <div className="beta-step"><span>02</span><strong>Fund the Vault</strong></div>
          <label>LEGACY PLAN ID<input inputMode="numeric" value={planId} onChange={(event) => { setPlanId(event.target.value.replace(/\D/g, "")); window.localStorage.setItem("kynlo-beta-plan-id", event.target.value.replace(/\D/g, "")); }} placeholder="1" /></label>
          <label>MOCK-B20 RAW AMOUNT<input inputMode="numeric" value={rawAmount} onChange={(event) => setRawAmount(event.target.value.replace(/\D/g, ""))} /></label>
          <p>Owner signs two testnet transactions: token approval, then Vault deposit.</p>
          <button disabled={!ready || Boolean(busy)} onClick={approveAndDeposit}>{busy === "deposit" ? "DEPOSITING…" : "APPROVE + DEPOSIT"}</button>
        </article>

        <article>
          <div className="beta-step"><span>03</span><strong>Successors Accept</strong></div>
          <p>Switch MetaMask to Successor A, accept, then switch to Successor B and accept the same Plan ID.</p>
          <div className="beta-plan-chip">PLAN <b>{planId || "—"}</b></div>
          <button disabled={!ready || !planId || Boolean(busy)} onClick={accept}>{busy === "accept" ? "ACCEPTING…" : "ACCEPT AS CONNECTED WALLET"}</button>
        </article>

        <article>
          <div className="beta-step"><span>04</span><strong>Seal + Proof of Life</strong></div>
          <p>Switch back to the owner. Seal only succeeds after the asset is deposited and every Successor has accepted.</p>
          <button disabled={!ready || !planId || Boolean(busy)} onClick={seal}>{busy === "seal" ? "SEALING…" : "SEAL LEGACY PLAN"}</button>
          <button className="beta-secondary" disabled={!ready || !planId || Boolean(busy)} onClick={proofOfLife}>{busy === "checkin" ? "CHECKING IN…" : "PROOF OF LIFE"}</button>
        </article>
      </div>
    </section>
  );
}
