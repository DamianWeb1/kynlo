"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./lifecycle.css";
import "./interaction-system.css";
import "./ui-shell.css";
import { CalmSurface, type KynloState, OwnershipPath, SpatialFrame, TimeRail } from "@/components/kynlo/interaction-system";
import { KynloLifecycleRing, KynloMark } from "@/components/kynlo/canonical";
import { BaseSepoliaBeta } from "@/components/kynlo/base-sepolia-beta";
import { HeaderWalletButton } from "@/components/kynlo/header-wallet-button";

type Phase = { key: KynloState; label: string; eyebrow: string; title: string; body: string; start: number; end: number; day: string };
const phases: Phase[] = [
  { key: "active", label: "Today", eyebrow: "Owner is present", title: "Your Legacy Plan is active.", body: "Proof of Life keeps the plan quiet. You remain in control and every ownership path stays closed.", start: 0, end: 0.2, day: "DAY 01" },
  { key: "approaching", label: "Proof of Life", eyebrow: "Time is advancing", title: "The deadline approaches.", body: "Time moves through the plan. The lifecycle ring drains while your assets remain exactly where you left them.", start: 0.2, end: 0.4, day: "DAY 89" },
  { key: "missed", label: "Deadline missed", eyebrow: "Countdown reached zero", title: "PROOF OF LIFE MISSED", body: "The check-in deadline has passed. No asset transfers. No Successor can claim. Kynlo does not treat silence as proof of death.", start: 0.4, end: 0.5, day: "DAY 90" },
  { key: "nothing", label: "Nothing moves", eyebrow: "Protected by design", title: "NOTHING MOVES.", body: "The Vault holds its position. Ownership does not move by a single unit while the protected recovery path opens.", start: 0.5, end: 0.59, day: "DAY 90" },
  { key: "protection", label: "Protection Window", eyebrow: "Recovery remains open", title: "30 DAYS OF PROTECTION.", body: "The owner can still return and record Proof of Life. Successors are visible to the plan, but the assets remain unreachable.", start: 0.59, end: 0.72, day: "DAY 91 → 120" },
  { key: "transition", label: "Succession Ready", eyebrow: "Protection completed", title: "SUCCESSION IS AVAILABLE.", body: "Only now does the sealed ownership map unlock. Accepted Successor wallets can claim their recorded allocation, subject to issuer policy.", start: 0.72, end: 0.88, day: "DAY 120" },
  { key: "resolved", label: "Ownership resolves", eyebrow: "Accepted plan · final state", title: "OWNERSHIP FINDS ITS PATH.", body: "The Vault resolves into the allocation you sealed. Every path is explicit, accepted and visible onchain.", start: 0.88, end: 1, day: "SUCCESSION" },
];
const stocks = [["NVDA", "NVIDIA"], ["AAPL", "APPLE"], ["MSFT", "MICROSOFT"], ["AMZN", "AMAZON"], ["GOOGL", "ALPHABET"], ["META", "META"], ["TSLA", "TESLA"], ["COIN", "COINBASE"], ["NFLX", "NETFLIX"], ["AMD", "AMD"], ["AVGO", "BROADCOM"], ["PLTR", "PALANTIR"]];
const discreteAnchors = [0.08, 0.3, 0.45, 0.545, 0.655, 0.8, 0.92];
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const rangeProgress = (value: number, start: number, end: number) => clamp((value - start) / (end - start));

export default function Home() {
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const lifecycleRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastProgressRef = useRef(-1);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(media.matches);
    syncMotion();
    media.addEventListener("change", syncMotion);
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
  }, []);

  const phase = useMemo(() => phases.find((item) => progress >= item.start && progress < item.end) ?? phases.at(-1)!, [progress]);
  const successionReveal = progress < 0.78 ? 0 : progress >= 0.96 ? 1 : rangeProgress(progress, 0.78, 0.96);
  const phaseIndex = phases.indexOf(phase);

  const jumpToPhase = (index: number) => {
    const lifecycle = lifecycleRef.current;
    if (!lifecycle) return;
    const distance = Math.max(1, lifecycle.offsetHeight - window.innerHeight);
    const target = lifecycle.offsetTop + discreteAnchors[index] * 0.88 * distance;
    window.scrollTo({ top: target, behavior: reducedMotion ? "auto" : "smooth" });
  };

  return <main>
    <header className="site-header"><a className="brand" href="#top" aria-label="Kynlo home"><KynloMark priority /><span>KYNLO</span></a><nav className="site-nav" aria-label="Main navigation"><a href="#lifecycle">HOW IT WORKS</a><a href="#assets">ASSETS</a><a href="#beta">LEGACY PLAN</a></nav><div className="header-right"><div className="network"><i /> BASE SEPOLIA</div><HeaderWalletButton /></div></header>
    <section className="hero" id="top"><div className="hero-spatial-axis" aria-hidden="true"><span>TIME ↓</span><span>OWNERSHIP →</span></div><p className="eyebrow">PROGRAMMABLE SUCCESSION · BASE</p><h1>YOUR ASSETS<br />HAVE A <em>FUTURE.</em></h1><div className="hero-bottom"><p>Set protected inheritance instructions for Coinbase Tokenized Stocks on Base.</p><a className="primary-action" href="#beta">CREATE A LEGACY PLAN <span>↘</span></a></div><div className="folio">KYNLO / 001</div></section>

    <section className="lifecycle" id="lifecycle" ref={lifecycleRef} data-phase={phase.key} data-reduced-motion={reducedMotion}>
      <SpatialFrame className="sticky-story">
        <div className="lifecycle-day" aria-hidden="true"><span>{phase.day}</span><i>{String(phaseIndex + 1).padStart(2, "0")}</i></div>
        <div className="story-copy" aria-live="polite">
          <p className="chapter">{String(phaseIndex + 1).padStart(2, "0")} / 07</p>
          <p className="moment">{phase.eyebrow}</p>
          <h2>{phase.title}</h2>
          <p className="body-copy">{phase.body}</p>
          <p className="scroll-cue">{phaseIndex < phases.length - 1 ? "SCROLL TO ADVANCE TIME ↓" : "THE PLAN HAS RESOLVED"}</p>
        </div>
        <CalmSurface active={phase.key === "nothing" || phase.key === "protection"}>
          <div className="lifecycle-visual"><KynloLifecycleRing progress={progress} phase={phase} /><OwnershipPath reveal={successionReveal} /></div>
        </CalmSurface>
        <TimeRail stages={phases} activeKey={phase.key} />
        <div className="phase-dock" aria-label="Lifecycle chapters">{phases.map((item, index) => <button key={item.key} className={phase.key === item.key ? "is-active" : ""} onClick={() => jumpToPhase(index)} aria-label={`Jump to ${item.label}`}><span>{String(index + 1).padStart(2, "0")}</span><b>{item.label}</b></button>)}</div>
        <div className="lifecycle-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
      </SpatialFrame>
    </section>

    <section className="asset-library" id="assets"><div className="asset-intro"><p className="eyebrow">THE ASSET LIBRARY</p><h2>Built for ownership,<br /><em>not speculation.</em></h2><p>Kynlo is designed around eligible Coinbase Tokenized Stocks on Base. The live Sepolia beta uses MOCK-B20 while production assets remain registry-gated.</p></div><div className="stock-grid">{stocks.map(([ticker, name], index) => <article className="stock-record" key={ticker}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{ticker}</strong><small>{name}</small></div><b>BASE</b></article>)}</div><p className="asset-note">DISPLAY LIBRARY · PRODUCTION SUPPORT REQUIRES OFFICIAL REGISTRY ADMISSION AND ISSUER ELIGIBILITY</p></section>
    <section className="vault-preview"><div className="section-heading"><p className="eyebrow">THE LEGACY VAULT</p><h2>Ownership, held<br />with intention.</h2><p>No price charts. No speculation. Each position remains a recorded ownership certificate inside your Kynlo Vault.</p></div><div className="certificate-stack" aria-label="Illustrative ownership certificate"><article className="certificate"><div className="cert-top"><KynloMark /><span>KYNLO VAULT<br />CERTIFICATE 001</span></div><div className="cert-main"><p>COINBASE TOKENIZED STOCK</p><h3>NVIDIA</h3><strong>NVDA</strong></div><div className="cert-footer"><span>PLAN SHARE<br /><b>60.00%</b></span><span>NETWORK<br /><b>BASE</b></span><span>RECORD<br /><b>ILLUSTRATIVE</b></span></div></article></div></section>
    <BaseSepoliaBeta />
    <section className="principle"><KynloMark /><p>Kynlo does not detect death.</p><h2>It executes a protected<br /><em>inactivity instruction.</em></h2><div className="legal-line">Coinbase Tokenized Stocks remain subject to issuer eligibility and transfer policies. Kynlo is not a legal-will replacement.</div></section>
    <footer className="site-footer"><div className="footer-brand"><KynloMark /><div><strong>KYNLO</strong><p>YOUR ASSETS HAVE A FUTURE.</p></div></div><div className="footer-links"><div><small>EXPLORE</small><a href="#lifecycle">How it works</a><a href="#assets">Assets</a><a href="#beta">Base Sepolia Beta</a></div><div><small>NETWORK</small><span>Base Sepolia · 84532</span><span>Testnet only</span><span>Mainnet disabled</span></div></div><div className="footer-bottom"><span>© 2026 KYNLO</span><span>PROGRAMMABLE SUCCESSION FOR ONCHAIN ASSETS</span><a href="#top">BACK TO TOP ↑</a></div></footer>
  </main>;
}
