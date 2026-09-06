"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "./base-sepolia-beta.css";

const BASE_SEPOLIA_CHAIN_ID = "0x14a34";
const BASE_SEPOLIA = { chainId: BASE_SEPOLIA_CHAIN_ID, chainName: "Base Sepolia", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://sepolia.base.org"], blockExplorerUrls: ["https://sepolia.basescan.org"] };
export const KYNLO_BASE_SEPOLIA = { registry: "0x17464F19349d6a3A72b48b3d664fEc7C4a4Bc528", vault: "0xff5284D7c47beF6D1fC1480d03CEF47d0d1c4CC0", mockAsset: "0x405ce45BcA33D84D9754e955726b4A6be0b76947" } as const;

type EthereumProvider = { request(args: { method: string; params?: unknown[] }): Promise<unknown>; on?: (event: string, listener: (...args: unknown[]) => void) => void; removeListener?: (event: string, listener: (...args: unknown[]) => void) => void };
declare global { interface Window { ethereum?: EthereumProvider } }

const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const short = (address: string) => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "NOT CONNECTED";
const utf8Hex = (value: string) => `0x${Array.from(new TextEncoder().encode(value), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
const word = (value: bigint | number | string) => (typeof value === "bigint" ? value : BigInt(value)).toString(16).padStart(64, "0");
const addressWord = (address: string) => address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
const allocationsFor = (count: number) => count === 1 ? [10000] : count === 2 ? [5000, 5000] : [3334, 3333, 3333];
const percent = (bps: number) => `${(bps / 100).toFixed(bps % 100 ? 2 : 0)}%`;

async function selector(provider: EthereumProvider, signature: string) { const hash = await provider.request({ method: "web3_sha3", params: [utf8Hex(signature)] }); if (typeof hash !== "string" || !hash.startsWith("0x") || hash.length < 10) throw new Error("Wallet RPC could not derive a function selector."); return hash.slice(2, 10); }
async function hasCode(provider: EthereumProvider, address: string) { const code = await provider.request({ method: "eth_getCode", params: [address, "latest"] }); return typeof code === "string" && code !== "0x" && code !== "0x0"; }
async function waitForReceipt(provider: EthereumProvider, hash: string) { for (let attempt = 0; attempt < 90; attempt += 1) { const receipt = await provider.request({ method: "eth_getTransactionReceipt", params: [hash] }); if (receipt && typeof receipt === "object") { if ((receipt as { status?: string }).status === "0x0") throw new Error("Transaction reverted on Base Sepolia."); return receipt; } await sleep(1200); } throw new Error("Transaction was submitted but confirmation timed out."); }
async function sendData(provider: EthereumProvider, from: string, to: string, data: string) { const hash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to, data }] }); if (typeof hash !== "string") throw new Error("Wallet did not return a transaction hash."); await waitForReceipt(provider, hash); return hash; }
function cleanError(error: unknown) { return error instanceof Error ? error.message.replace(/^Error:\s*/i, "") : "Transaction was cancelled or failed."; }

export function BaseSepoliaBeta() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [checking, setChecking] = useState(false);
  const [contractsLive, setContractsLive] = useState<boolean | null>(null);
  const [message, setMessage] = useState("Connect a wallet to compose a live Base Sepolia Legacy Plan.");
  const [busy, setBusy] = useState("");
  const [successors, setSuccessors] = useState(["", ""]);
  const [rawAmount, setRawAmount] = useState("1000");
  const [planId, setPlanId] = useState("");
  const [lastTx, setLastTx] = useState("");
  const provider = useMemo(() => (typeof window === "undefined" ? undefined : window.ethereum), []);
  const onBaseSepolia = chainId.toLowerCase() === BASE_SEPOLIA_CHAIN_ID;
  const ready = Boolean(account && provider && onBaseSepolia && contractsLive);
  const allocations = allocationsFor(successors.length);

  const sync = useCallback(async () => { if (!provider) return; const [accounts, currentChain] = await Promise.all([provider.request({ method: "eth_accounts" }), provider.request({ method: "eth_chainId" })]); const list = Array.isArray(accounts) ? accounts : []; setAccount(typeof list[0] === "string" ? list[0] : ""); setChainId(typeof currentChain === "string" ? currentChain : ""); }, [provider]);
  useEffect(() => { const saved = window.localStorage.getItem("kynlo-beta-plan-id"); if (saved) setPlanId(saved); }, []);
  useEffect(() => { void sync(); if (!provider?.on) return; const changed = () => void sync(); provider.on("accountsChanged", changed); provider.on("chainChanged", changed); return () => { provider.removeListener?.("accountsChanged", changed); provider.removeListener?.("chainChanged", changed); }; }, [provider, sync]);
  useEffect(() => { if (!provider || !onBaseSepolia) { setContractsLive(null); return; } let active = true; setChecking(true); Promise.all([hasCode(provider, KYNLO_BASE_SEPOLIA.registry), hasCode(provider, KYNLO_BASE_SEPOLIA.vault), hasCode(provider, KYNLO_BASE_SEPOLIA.mockAsset)]).then((values) => { if (!active) return; const live = values.every(Boolean); setContractsLive(live); setMessage(live ? "Staging contracts verified. Compose your Legacy Plan below." : "Could not verify every staging contract from this wallet provider."); }).catch(() => { if (active) { setContractsLive(false); setMessage("Contract verification failed. Check the wallet RPC and try again."); } }).finally(() => active && setChecking(false)); return () => { active = false; }; }, [provider, onBaseSepolia]);

  const connect = async () => { if (!provider) { setMessage("No injected wallet found. Install or enable MetaMask in this browser."); return; } try { await provider.request({ method: "eth_requestAccounts" }); await sync(); setMessage("Wallet connected. Base Sepolia is required for this beta."); } catch { setMessage("Wallet connection was cancelled."); } };
  const switchNetwork = async () => { if (!provider) return; try { await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }] }); } catch { try { await provider.request({ method: "wallet_addEthereumChain", params: [BASE_SEPOLIA] }); } catch { setMessage("Base Sepolia network switch was cancelled."); } } await sync(); };
  const run = async (label: string, action: () => Promise<string | void>) => { if (!provider || !account || !ready || busy) return; setBusy(label); setLastTx(""); try { const tx = await action(); if (tx) setLastTx(tx); } catch (error) { setMessage(cleanError(error)); } finally { setBusy(""); } };

  const updateSuccessor = (index: number, value: string) => setSuccessors((current) => current.map((item, itemIndex) => itemIndex === index ? value.trim() : item));
  const addSuccessor = () => setSuccessors((current) => current.length < 3 ? [...current, ""] : current);
  const removeSuccessor = (index: number) => setSuccessors((current) => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current);

  const createPlan = () => run("create", async () => {
    if (!provider) return;
    if (successors.some((value) => !addressPattern.test(value))) throw new Error("Enter a valid wallet for every Successor.");
    const normalized = successors.map((value) => value.toLowerCase());
    if (new Set(normalized).size !== normalized.length) throw new Error("Every Successor must use a different wallet.");
    if (normalized.includes(account.toLowerCase())) throw new Error("The owner cannot also be a Successor.");
    const nextSelector = await selector(provider, "nextPlanId()");
    const next = await provider.request({ method: "eth_call", params: [{ to: KYNLO_BASE_SEPOLIA.vault, data: `0x${nextSelector}` }, "latest"] });
    if (typeof next !== "string") throw new Error("Could not resolve the next Legacy Plan ID.");
    const expectedPlanId = BigInt(next).toString();
    const fn = await selector(provider, "createLegacyPlan((address,uint16)[],uint64,uint64)");
    const head = `${word(96)}${word(90 * 24 * 60 * 60)}${word(30 * 24 * 60 * 60)}`;
    const tail = `${word(successors.length)}${successors.map((wallet, index) => `${addressWord(wallet)}${word(allocations[index])}`).join("")}`;
    setMessage("Confirm Legacy Plan creation in MetaMask.");
    const tx = await sendData(provider, account, KYNLO_BASE_SEPOLIA.vault, `0x${fn}${head}${tail}`);
    setPlanId(expectedPlanId); window.localStorage.setItem("kynlo-beta-plan-id", expectedPlanId); setMessage(`Legacy Plan #${expectedPlanId} created with ${successors.length} Successor${successors.length > 1 ? "s" : ""}. Next fund the Kynlo Vault.`); return tx;
  });

  const approveAndDeposit = () => run("deposit", async () => { if (!provider) return; const id = BigInt(planId || "0"); const amount = BigInt(rawAmount || "0"); if (id <= 0n) throw new Error("Enter a valid Legacy Plan ID."); if (amount <= 0n) throw new Error("Deposit amount must be greater than zero."); const approve = await selector(provider, "approve(address,uint256)"); setMessage("1/2 Confirm MOCK-B20 approval in MetaMask."); await sendData(provider, account, KYNLO_BASE_SEPOLIA.mockAsset, `0x${approve}${addressWord(KYNLO_BASE_SEPOLIA.vault)}${word(amount)}`); const deposit = await selector(provider, "depositAsset(uint256,address,uint256)"); setMessage("2/2 Confirm Kynlo Vault deposit in MetaMask."); const tx = await sendData(provider, account, KYNLO_BASE_SEPOLIA.vault, `0x${deposit}${word(id)}${addressWord(KYNLO_BASE_SEPOLIA.mockAsset)}${word(amount)}`); setMessage(`Vault funded for Legacy Plan #${id}. Each Successor must now accept.`); return tx; });
  const accept = () => run("accept", async () => { if (!provider) return; const id = BigInt(planId || "0"); if (id <= 0n) throw new Error("Enter the Legacy Plan ID first."); const fn = await selector(provider, "acceptSuccessor(uint256)"); setMessage("Confirm Successor acceptance in MetaMask."); const tx = await sendData(provider, account, KYNLO_BASE_SEPOLIA.vault, `0x${fn}${word(id)}`); setMessage(`Wallet ${short(account)} accepted Legacy Plan #${id}.`); return tx; });
  const seal = () => run("seal", async () => { if (!provider) return; const id = BigInt(planId || "0"); if (id <= 0n) throw new Error("Enter the Legacy Plan ID first."); const fn = await selector(provider, "armLegacyPlan(uint256)"); setMessage("Confirm Seal in the owner wallet."); const tx = await sendData(provider, account, KYNLO_BASE_SEPOLIA.vault, `0x${fn}${word(id)}`); setMessage(`Legacy Plan #${id} is SEALED and active.`); return tx; });
  const proofOfLife = () => run("checkin", async () => { if (!provider) return; const id = BigInt(planId || "0"); if (id <= 0n) throw new Error("Enter the Legacy Plan ID first."); const fn = await selector(provider, "checkIn(uint256)"); setMessage("Confirm Proof of Life in the owner wallet."); const tx = await sendData(provider, account, KYNLO_BASE_SEPOLIA.vault, `0x${fn}${word(id)}`); setMessage(`Proof of Life recorded for Legacy Plan #${id}.`); return tx; });
  const planReady = successors.every((value) => addressPattern.test(value));

  return <section className="beta-console" id="beta" aria-label="Kynlo Base Sepolia beta">
    <div className="composer-intro"><p className="eyebrow">LEGACY PLAN COMPOSER · BASE SEPOLIA</p><div><h2>Write the future of your ownership.</h2><p>Add up to three Successors, watch the ownership map form, fund the Vault, collect acceptance, then Seal.</p></div></div>
    <div className="mobile-flow-nav"><span>01 COMPOSE</span><span>02 FUND</span><span>03 ACCEPT</span><span>04 SEAL</span></div>
    <div className="composer-shell" id="legacy-plan">
      <aside className="composer-rail"><div className="rail-kicker">PLAN / {planId || "DRAFT"}</div><ol><li className="is-current"><span>01</span><b>Compose</b><small>Owner + Successors</small></li><li><span>02</span><b>Fund</b><small>Deposit asset</small></li><li><span>03</span><b>Accept</b><small>Exact wallets</small></li><li><span>04</span><b>Seal</b><small>Activate plan</small></li></ol><div className="rail-status"><i className={ready ? "is-live" : ""} /><span>{checking ? "CHECKING CONTRACTS" : ready ? "READY ON BASE SEPOLIA" : account ? "ACTION REQUIRED" : "WALLET NOT CONNECTED"}</span></div></aside>
      <div className="composer-workspace">
        <div className="composer-toolbar"><div><small>OWNER</small><strong>{short(account)}</strong></div><div><small>NETWORK</small><strong>{onBaseSepolia ? "BASE SEPOLIA" : "NOT READY"}</strong></div>{!account ? <button onClick={connect}>CONNECT WALLET</button> : !onBaseSepolia ? <button onClick={switchNetwork}>SWITCH NETWORK</button> : <span className="connected-chip">CONNECTED</span>}</div>
        <div className="ownership-canvas">
          <div className="canvas-axis"><span>OWNERSHIP →</span><span>TIME ↓</span></div><div className="owner-node"><small>OWNER</small><strong>{account ? short(account) : "CONNECT WALLET"}</strong><span>100%</span></div><div className="ownership-trunk" />
          <div className={`successor-grid successor-count-${successors.length}`}>{successors.map((wallet, index) => <label className={addressPattern.test(wallet) ? "successor-node is-valid" : "successor-node"} key={index}><div><small>SUCCESSOR {String.fromCharCode(65 + index)}</small><b>{percent(allocations[index])}</b></div><input value={wallet} onChange={(event) => updateSuccessor(index, event.target.value)} placeholder="0x wallet address" /><span>{addressPattern.test(wallet) ? "WALLET VALID" : "AWAITING WALLET"}</span>{successors.length > 1 ? <button type="button" className="remove-successor" onClick={() => removeSuccessor(index)}>REMOVE</button> : null}</label>)}</div>
          <div className="successor-controls"><button type="button" onClick={addSuccessor} disabled={successors.length >= 3}>+ ADD SUCCESSOR</button><span>{successors.length} / 3 WALLETS</span></div>
          <div className="allocation-rule"><span>0%</span><div>{allocations.map((value, index) => <i key={index} style={{ left: `${allocations.slice(0, index + 1).reduce((sum, item) => sum + item, 0) / 100}%` }} />)}</div><b>AUTOMATIC ALLOCATION · TOTAL 100%</b><span>100%</span></div>
        </div>
        <div className="plan-document"><div className="document-head"><span>KYNLO / LEGACY PLAN</span><b>{planId ? `#${planId}` : "DRAFT"}</b></div><div className="document-grid"><div><small>INACTIVITY PERIOD</small><strong>90 DAYS</strong><p>Proof of Life keeps the plan active.</p></div><div><small>PROTECTION WINDOW</small><strong>30 DAYS</strong><p>Nothing moves while recovery remains open.</p></div><div><small>SUCCESSORS</small><strong>{successors.length} {successors.length === 1 ? "WALLET" : "WALLETS"}</strong><p>Every exact wallet must accept before Seal.</p></div></div><button className="create-plan-action" disabled={!ready || !planReady || Boolean(busy)} onClick={createPlan}>{busy === "create" ? "CREATING PLAN…" : planId ? "CREATE ANOTHER PLAN" : "CREATE LEGACY PLAN"}<span>↗</span></button></div>
      </div>
    </div>
    <div className="execution-strip"><article><span>02 / FUND</span><h3>Place an asset inside the Vault.</h3><label>PLAN ID<input inputMode="numeric" value={planId} onChange={(event) => { const value = event.target.value.replace(/\D/g, ""); setPlanId(value); window.localStorage.setItem("kynlo-beta-plan-id", value); }} placeholder="Plan ID" /></label><label>MOCK-B20 RAW AMOUNT<input inputMode="numeric" value={rawAmount} onChange={(event) => setRawAmount(event.target.value.replace(/\D/g, ""))} /></label><button disabled={!ready || !planId || Boolean(busy)} onClick={approveAndDeposit}>{busy === "deposit" ? "DEPOSITING…" : "APPROVE + DEPOSIT"}</button></article><article><span>03 / ACCEPT</span><h3>Successors sign their exact path.</h3><p>Switch MetaMask through each Successor wallet and accept Plan #{planId || "—"}. All {successors.length} must accept before Seal.</p><button disabled={!ready || !planId || Boolean(busy)} onClick={accept}>{busy === "accept" ? "ACCEPTING…" : "ACCEPT AS CONNECTED WALLET"}</button></article><article><span>04 / SEAL</span><h3>Turn the draft into an active plan.</h3><p>Return to the owner wallet. Seal succeeds only after funding and every Successor acceptance.</p><button disabled={!ready || !planId || Boolean(busy)} onClick={seal}>{busy === "seal" ? "SEALING…" : "HOLD TO SEAL"}</button><button className="quiet-action" disabled={!ready || !planId || Boolean(busy)} onClick={proofOfLife}>{busy === "checkin" ? "CHECKING IN…" : "PROOF OF LIFE"}</button></article></div>
    <div className="beta-feedback"><div><small>LIVE STATUS</small><p>{busy ? `Waiting for ${busy} transaction…` : message}</p></div>{lastTx ? <a href={`https://sepolia.basescan.org/tx/${lastTx}`} target="_blank" rel="noreferrer">VIEW TRANSACTION ↗</a> : null}</div>
  </section>;
}
