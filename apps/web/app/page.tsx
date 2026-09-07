"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./lifecycle.css";
import "./interaction-system.css";
import "./ui-shell.css";
import { CalmSurface, type KynloState, OwnershipPath, SpatialFrame, TimeRail } from "@/components/kynlo/interaction-system";
import { KynloLifecycleRing, KynloMark } from "@/components/kynlo/canonical";
import { BaseSepoliaBeta } from "@/components/kynlo/base-sepolia-beta";
import { HeaderWalletButton } from "@/components/kynlo/header-wallet-button";
import { AccountAccess } from "@/components/kynlo/account-access";

type Phase = { key: KynloState; label: string; eyebrow: string; title: string; body: string; start: number; end: number; day: string };
const phases: Phase[] = [
  { key: "active", label: "Today", eyebrow: "Owner is present", title: "Your Legacy Plan is active.", body: "Record Proof of Life every 90 days. You remain in control and no Successor can claim.", start: 0, end: 0.2, day: "DAY 01" },
  { key: "approaching", label: "Proof of Life", eyebrow: "Time is advancing", title: "The deadline approaches.", body: "The lifecycle ring drains as the check-in deadline approaches. Your assets remain exactly where you placed them.", start: 0.2, end: 0.4, day: "DAY 89" },
  { key: "missed", label: "Deadline missed", eyebrow: "Countdown reached zero", title: "PROOF OF LIFE MISSED", body: "The check-in deadline has passed. No asset transfers. No Successor can claim. Kynlo does not treat silence as proof of death.", start: 0.4, end: 0.5, day: "DAY 90" },
  { key: "nothing", label: "Nothing moves", eyebrow: "Protected by design", title: "NOTHING MOVES.", body: "The Vault holds every deposited position while the recovery period opens. No Successor can claim yet.", start: 0.5, end: 0.59, day: "DAY 90" },
  { key: "protection", label: "Protection Window", eyebrow: "Recovery remains open", title: "30 DAYS OF PROTECTION.", body: "You still have 30 days to return and record Proof of Life. Your assets remain locked from Successor claims.", start: 0.59, end: 0.72, day: "DAY 91 → 120" },
  { key: "transition", label: "Succession Ready", eyebrow: "Protection completed", title: "SUCCESSION IS AVAILABLE.", body: "Only now can each assigned Successor claim their recorded allocation, subject to issuer policy.", start: 0.72, end: 0.88, day: "DAY 120" },
  { key: "resolved", label: "Ownership resolves", eyebrow: "Sealed plan · final state", title: "OWNERSHIP FINDS ITS PATH.", body: "Each successful claim follows the allocation you sealed. Every receiving wallet and share remains explicit onchain.", start: 0.88, end: 1, day: "SUCCESSION" },
];
const stocks = [["NVDA", "NVIDIA"], ["AAPL", "APPLE"], ["MSFT", "MICROSOFT"], ["AMZN", "AMAZON"], ["GOOGL", "ALPHABET"], ["META", "META"], ["TSLA", "TESLA"], ["COIN", "COINBASE"], ["NFLX", "NETFLIX"], ["AMD", "AMD"], ["AVGO", "BROADCOM"], ["PLTR", "PALANTIR"]] as const;
const discreteAnchors = [0.08, 0.3, 0.45, 0.545, 0.655, 0.8, 0.92];
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const rangeProgress = (value: number, start: number, end: number) => clamp((value - start) / (end - start));

export default function Home() {
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mobileMode, setMobileMode] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState("NVDA");
  const [assetMenuOpen, setAssetMenuOpen] = useState(false);
  const lifecycleRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastProgressRef = useRef(-1);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 560px)");
    const sync = () => setMobileMode(mobile.matches);
    sync();
    mobile.addEventListener("change", sync);
    return () => mobile.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(media.matches);
    syncMotion();
    media.addEventListener("change", syncMotion);
    if (mobileMode) return () => media.removeEventListener("change", syncMotion);

    const update = () => {
      frameRef.current = null;
      const lifecycle = lifecycleRef.current;
      if (!lifecycle) return;
      const start = lifecycle.offsetTop;
      const distance = Math.max(1, lifecycle.offsetHeight - window.innerHeight);
      const raw = clamp((window.scrollY - start) / distance, 0, 0.9999);
      const timeline = raw < 0.88 ? (raw / 0.88) * 0.96 : 0.985;
      let nextProgress = timeline;
      if (media.matches) {
        const phaseIndex = phases.findIndex((item) => timeline >= item.start && timeline < item.end);
        nextProgress = timeline >= 0.96 ? 0.98 : discreteAnchors[Math.max(0, phaseIndex)];
      }
      if (Math.abs(nextProgress - lastProgressRef.current) < 0.0005) return;
      lastProgressRef.current = nextProgress;
      setProgress(nextProgress);
    };
    const schedule = () => { if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      media.removeEventListener("change", syncMotion);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [mobileMode]);

  const phase = useMemo(() => phases.find((item) => progress >= item.start && progress < item.end) ?? phases.at(-1)!, [progress]);
  const successionReveal = mobileMode && phase.key === "resolved" ? 1 : progress < 0.78 ? 0 : progress >= 0.96 ? 1 : rangeProgress(progress, 0.78, 0.96);
  const phaseIndex = phases.indexOf(phase);
  const activeAsset = stocks.find(([ticker]) => ticker === selectedAsset) ?? stocks[0];

  const jumpToPhase = (index: number) => {
    if (mobileMode) {
      setProgress(discreteAnchors[index]);
      return;
    }
    const lifecycle = lifecycleRef.current;
    if (!lifecycle) return;
    const distance = Math.max(1, lifecycle.offsetHeight - window.innerHeight);
    const target = lifecycle.offsetTop + discreteAnchors[index] * 0.88 * distance;
    window.scrollTo({ top: target, behavior: reducedMotion ? "auto" : "smooth" });
  };

  return <main>
    <header className="site-header"><a className="brand" href="#top" aria-label="Kynlo home"><KynloMark priority /><span>KYNLO</span></a><nav className="site-nav" aria-label="Main navigation"><a href="#lifecycle">HOW IT WORKS</a><a href="#assets">ASSETS</a><a href="#beta">LEGACY PLAN</a></nav><div className="header-right"><div className="network"><i /> BASE SEPOLIA</div><HeaderWalletButton /></div></header>

    <section className="hero" id="top"><div className="hero-spatial-axis" aria-hidden="true"><span>TIME ↓</span><span>OWNERSHIP →</span></div><p className="eyebrow">PROGRAMMABLE SUCCESSION · BASE SEPOLIA</p><h1>YOUR ASSETS<br />HAVE A <em>FUTURE.</em></h1><div className="hero-bottom"><p>Create a protected succession plan for your onchain assets. Stay in control through Proof of Life.</p><a className="primary-action" href="#account">EMAIL OR WALLET SIGN IN <span>↘</span></a></div><div className="folio">KYNLO / 001</div></section>

    <section className="lifecycle" id="lifecycle" ref={lifecycleRef} data-phase={phase.key} data-reduced-motion={reducedMotion} data-mobile={mobileMode}>
      <SpatialFrame className="sticky-story">
        <div className="lifecycle-day" aria-hidden="true"><span>{phase.day}</span><i>{String(phaseIndex + 1).padStart(2, "0")}</i></div>
        <div className="story-copy" aria-live="polite"><p className="chapter">{String(phaseIndex + 1).padStart(2, "0")} / 07</p><p className="moment">{phase.eyebrow}</p><h2>{phase.title}</h2><p className="body-copy">{phase.body}</p><p className="scroll-cue">{mobileMode ? "TAP TO ADVANCE TIME" : phaseIndex < phases.length - 1 ? "SCROLL TO ADVANCE TIME ↓" : "THE PLAN HAS RESOLVED"}</p></div>
        <CalmSurface active={phase.key === "nothing" || phase.key === "protection"}><div className="lifecycle-visual"><KynloLifecycleRing progress={progress} phase={phase} /><OwnershipPath reveal={successionReveal} /></div></CalmSurface>
        <TimeRail stages={phases} activeKey={phase.key} />
        <div className="phase-dock" aria-label="Lifecycle chapters">{phases.map((item, index) => <button key={item.key} className={phase.key === item.key ? "is-active" : ""} onClick={() => jumpToPhase(index)} aria-label={`Jump to ${item.label}`}><span>{String(index + 1).padStart(2, "0")}</span><b>{item.label}</b></button>)}</div>
        <div className="mobile-lifecycle-controls"><button disabled={phaseIndex === 0} onClick={() => jumpToPhase(Math.max(0, phaseIndex - 1))}>← PREVIOUS</button><button disabled={phaseIndex === phases.length - 1} onClick={() => jumpToPhase(Math.min(phases.length - 1, phaseIndex + 1))}>{phaseIndex === phases.length - 1 ? "COMPLETE" : "NEXT →"}</button></div>
        <div className="lifecycle-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
      </SpatialFrame>
    </section>

    <section className="asset-library" id="assets">
      <div className="asset-intro"><p className="eyebrow">YOUR DIGITAL ESTATE</p><h2>Real assets.<br /><em>Real succession.</em></h2><p>Choose the assets your Legacy Plan will cover. This Base Sepolia beta uses MOCK-B20 assets for testing.</p></div>
      <div className="asset-selector-shell">
        <div className="asset-select-label" onKeyDown={(event) => { if (event.key === "Escape") setAssetMenuOpen(false); }}>
          <span>SELECT ASSET</span>
          <button className="asset-select-trigger" type="button" aria-expanded={assetMenuOpen} aria-controls="asset-register" onClick={() => setAssetMenuOpen((open) => !open)}>
            <span><b>{activeAsset[0]}</b><i>{activeAsset[1]}</i></span>
            <span aria-hidden="true">{assetMenuOpen ? "CLOSE ↑" : "OPEN INDEX ↓"}</span>
          </button>
        </div>
        {assetMenuOpen && <div className="asset-register" id="asset-register" role="listbox" aria-label="Available asset records">
          <div className="asset-register-heading"><span>BASE ASSET INDEX</span><span>{String(stocks.length).padStart(2, "0")} RECORDS</span></div>
          <div className="asset-register-grid">{stocks.map(([ticker, name], index) => <button type="button" role="option" aria-selected={ticker === selectedAsset} className={ticker === selectedAsset ? "is-selected" : ""} value={ticker} key={ticker} onClick={() => { setSelectedAsset(ticker); setAssetMenuOpen(false); }}><small>{String(index + 1).padStart(2, "0")}</small><strong>{ticker}</strong><span>{name}</span><i aria-hidden="true">{ticker === selectedAsset ? "●" : "→"}</i></button>)}</div>
        </div>}
        <article className="selected-asset"><div><small>SELECTED RECORD</small><strong>{activeAsset[0]}</strong><span>{activeAsset[1]}</span></div><b>BASE</b><p>Preview only. Base Sepolia executes against the admitted MOCK-B20 staging asset.</p></article>
      </div>
      <p className="asset-note">DISPLAY LIBRARY · PRODUCTION SUPPORT REQUIRES OFFICIAL REGISTRY ADMISSION AND ISSUER ELIGIBILITY</p>
    </section>

    <section className="vault-preview"><div className="section-heading"><p className="eyebrow">THE LEGACY VAULT</p><h2>Your assets,<br />recorded clearly.</h2><p>Your Kynlo Vault tracks each deposited position in raw token units. No price charts. No speculation.</p></div><div className="certificate-stack" aria-label="Illustrative ownership certificate"><article className="certificate"><div className="cert-top"><KynloMark /><span>KYNLO VAULT<br />CERTIFICATE 001</span></div><div className="cert-main"><p>MOCK TOKENIZED ASSET</p><h3>{activeAsset[1]}</h3><strong>{activeAsset[0]}</strong></div><div className="cert-footer"><span>PLAN SHARE<br /><b>60.00%</b></span><span>NETWORK<br /><b>BASE SEPOLIA</b></span><span>RECORD<br /><b>ILLUSTRATIVE</b></span></div></article></div></section>
    <AccountAccess />
    <BaseSepoliaBeta />
    <section className="principle"><KynloMark /><p>Kynlo does not detect death.</p><h2>It responds only<br /><em>to inactivity.</em></h2><div className="legal-line">Kynlo is not a legal will or a replacement for estate planning. Tokenized assets remain subject to issuer eligibility and transfer policies. Kynlo does not bypass those restrictions.</div></section>
    <footer className="site-footer"><div className="footer-brand"><KynloMark /><div><strong>KYNLO</strong><p>YOUR ASSETS HAVE A FUTURE.</p></div></div><div className="footer-links"><div><small>EXPLORE</small><a href="#lifecycle">How it works</a><a href="#assets">Assets</a><a href="#beta">Base Sepolia Beta</a></div><div><small>NETWORK</small><span>Base Sepolia · 84532</span><span>Testnet only</span><span>Mainnet disabled</span></div></div><div className="footer-bottom"><span>© 2026 KYNLO</span><span>PROGRAMMABLE SUCCESSION FOR ONCHAIN ASSETS</span><a href="#top">BACK TO TOP ↑</a></div></footer>
  </main>;
}
