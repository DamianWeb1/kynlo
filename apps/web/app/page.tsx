"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./lifecycle.css";
import "./interaction-system.css";
import { CalmSurface, type KynloState, OwnershipPath, SpatialFrame, TimeRail } from "@/components/kynlo/interaction-system";
import { KynloLifecycleRing, KynloMark } from "@/components/kynlo/canonical";

type Phase = {
  key: KynloState;
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  start: number;
  end: number;
};

const phases: Phase[] = [
  { key: "active", label: "Today", eyebrow: "Owner is present", title: "Your Legacy Plan is active.", body: "Proof of Life keeps the plan quiet. The owner remains in control and no Succession path is open.", start: 0, end: 0.2 },
  { key: "approaching", label: "Proof of Life", eyebrow: "Time is advancing", title: "The deadline approaches.", body: "The lifecycle ring depletes as the onchain Proof of Life deadline moves closer to zero.", start: 0.2, end: 0.4 },
  { key: "missed", label: "Deadline missed", eyebrow: "Countdown reached zero", title: "PROOF OF LIFE MISSED", body: "The owner has not checked in. No asset transfers. No Successor claim begins.", start: 0.4, end: 0.5 },
  { key: "nothing", label: "Nothing moves", eyebrow: "Protected by design", title: "NOTHING MOVES.", body: "A missed check-in is not treated as proof of death. Kynlo pauses before any ownership path becomes available.", start: 0.5, end: 0.59 },
  { key: "protection", label: "Protection Window", eyebrow: "Recovery remains open", title: "THE PROTECTION WINDOW BEGINS.", body: "The owner gets a protected recovery period of at least 30 days. Proof of Life still restores the Legacy Plan.", start: 0.59, end: 0.72 },
  { key: "transition", label: "Succession Ready", eyebrow: "Protection completed", title: "SUCCESSION IS AVAILABLE.", body: "The sealed allocation becomes claimable by the accepted Successor wallets, subject to issuer policy.", start: 0.72, end: 0.88 },
  { key: "resolved", label: "Ownership resolves", eyebrow: "Accepted plan · final state", title: "SUCCESSION IS AVAILABLE.", body: "The ownership paths are fully resolved. Each asset points to the allocation recorded in the sealed Legacy Plan.", start: 0.88, end: 1 },
];

const discreteAnchors = [0.08, 0.3, 0.45, 0.545, 0.655, 0.8, 0.92];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function rangeProgress(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start));
}

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
      // Reserve the final 18% of physical scroll distance as a completed-state hold.
      const timeline = raw < 0.82 ? (raw / 0.82) * 0.96 : 0.98;
      let nextProgress = timeline;
      if (media.matches) {
        const phaseIndex = phases.findIndex((item) => timeline >= item.start && timeline < item.end);
        nextProgress = timeline >= 0.96 ? 0.98 : discreteAnchors[Math.max(0, phaseIndex)];
      }
      if (Math.abs(nextProgress - lastProgressRef.current) < 0.0005) return;
      lastProgressRef.current = nextProgress;
      setProgress(nextProgress);
    };
    const schedule = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(update);
    };
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

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Kynlo home"><KynloMark priority /><span>KYNLO</span></a>
        <div className="network"><i /> BASE MAINNET</div>
        <a className="header-link" href="#lifecycle">Explore the lifecycle <span>↘</span></a>
      </header>
      <section className="hero" id="top">
        <div className="hero-spatial-axis" aria-hidden="true"><span>TIME ↓</span><span>OWNERSHIP →</span></div>
        <p className="eyebrow">PROGRAMMABLE SUCCESSION · BASE</p>
        <h1>YOUR ASSETS<br />HAVE A <em>FUTURE.</em></h1>
        <div className="hero-bottom"><p>Set protected inheritance instructions for Coinbase Tokenized Stocks on Base.</p><a className="primary-action" href="#lifecycle">SEE HOW TIME WORKS <span>↓</span></a></div>
        <div className="folio">KYNLO / 001</div>
      </section>

      <section className="lifecycle" id="lifecycle" ref={lifecycleRef} data-phase={phase.key} data-reduced-motion={reducedMotion}>
        <SpatialFrame className="sticky-story">
          <div className="story-copy" aria-live="polite">
            <p className="chapter">{String(phases.indexOf(phase) + 1).padStart(2, "0")} / 07</p>
            <p className="moment">{phase.eyebrow}</p>
            <h2>{phase.title}</h2>
            <p className="body-copy">{phase.body}</p>
          </div>
          <CalmSurface active={phase.key === "nothing" || phase.key === "protection"}>
          <div className="lifecycle-visual">
            <KynloLifecycleRing progress={progress} phase={phase} />
            <OwnershipPath reveal={successionReveal} />
          </div>
          </CalmSurface>
          <TimeRail stages={phases} activeKey={phase.key} />
          <div className="lifecycle-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
        </SpatialFrame>
      </section>

      <section className="vault-preview">
        <div className="section-heading"><p className="eyebrow">THE LEGACY VAULT</p><h2>Ownership, held<br />with intention.</h2><p>No price charts. No speculation. Each position remains a recorded ownership certificate inside your Kynlo Vault.</p></div>
        <div className="certificate-stack" aria-label="Illustrative ownership certificate"><article className="certificate"><div className="cert-top"><KynloMark /><span>KYNLO VAULT<br />CERTIFICATE 001</span></div><div className="cert-main"><p>COINBASE TOKENIZED STOCK</p><h3>NVIDIA</h3><strong>NVDAc</strong></div><div className="cert-footer"><span>PLAN SHARE<br /><b>60.00%</b></span><span>NETWORK<br /><b>BASE</b></span><span>RECORD<br /><b>ILLUSTRATIVE</b></span></div></article></div>
      </section>
      <section className="principle"><KynloMark /><p>Kynlo does not detect death.</p><h2>It executes a protected<br /><em>inactivity instruction.</em></h2><div className="legal-line">Coinbase Tokenized Stocks remain subject to issuer eligibility and transfer policies. Kynlo is not a legal-will replacement.</div></section>
    </main>
  );
}
