"use client";

import Image from "next/image";
import { KynloSignal, type KynloState } from "./interaction-system";

export type LifecyclePhase = { key: KynloState; label: string; title: string };
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const rangeProgress = (value: number, start: number, end: number) => clamp((value - start) / (end - start));

export function KynloMark({ tone = "light", priority = false }: { tone?: "light" | "ink"; priority?: boolean }) {
  return <Image className="k-mark" src="/kynlo-mark.svg" alt="Kynlo" width={64} height={64} data-dark={tone === "ink"} priority={priority} />;
}

export function KynloLifecycleRing({ progress, phase }: { progress: number; phase: LifecyclePhase }) {
  const radius = 142;
  const circumference = 2 * Math.PI * radius;
  const deadlineProgress = rangeProgress(progress, 0.02, 0.4);
  const ringRemaining = Math.max(0.035, 1 - deadlineProgress * 0.965);
  const protectionProgress = rangeProgress(progress, 0.59, 0.72);
  const successionProgress = rangeProgress(progress, 0.72, 0.88);
  const totalMinutes = Math.round((1 - deadlineProgress) * 90 * 24 * 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const isPastDeadline = progress >= 0.4;
  const stateLabel = phase.key === "resolved" || phase.key === "transition" ? "SUCCESSION READY" : phase.key === "protection" ? "PROTECTED" : phase.key === "nothing" || phase.key === "missed" ? "MISSED" : "ACTIVE";
  const detail = phase.key === "protection" ? `${Math.round(protectionProgress * 30)} / 30 DAYS` : phase.key === "resolved" || phase.key === "transition" ? "CLAIM PATH OPEN" : phase.key === "missed" || phase.key === "nothing" ? "ASSETS LOCKED" : "BASE SEPOLIA";

  return <div className={`ring-shell lifecycle-ring phase-${phase.key}`} aria-label={`${phase.title}. Lifecycle ${Math.round(progress * 100)} percent complete.`}>
    <svg viewBox="0 0 320 320" role="img">
      <circle className="ring-track" cx="160" cy="160" r={radius} />
      <circle className="ring-progress" cx="160" cy="160" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ringRemaining)} />
      <circle className="protection-track" cx="160" cy="160" r="151" />
      <circle className="protection-progress" cx="160" cy="160" r="151" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - protectionProgress} />
      {progress >= 0.72 && <g className="succession-break" style={{ opacity: successionProgress }}><path d="M266 61 300 28" /><path d="M283 82l31-7" /></g>}
    </svg>
    <div className="ring-center">
      <span>{phase.label}</span>
      {!isPastDeadline ? <strong className="countdown">{String(days).padStart(2, "0")}D {String(hours).padStart(2, "0")}H {String(minutes).padStart(2, "0")}M</strong> : <strong>{stateLabel}</strong>}
      <small>{detail}</small>
      <KynloSignal state={phase.key} />
    </div>
  </div>;
}
