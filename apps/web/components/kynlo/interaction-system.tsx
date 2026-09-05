"use client";

import type { CSSProperties, ReactNode } from "react";

export type KynloState = "active" | "approaching" | "missed" | "nothing" | "protection" | "transition" | "resolved";

export function SpatialFrame({ children, className = "", showAxes = true }: { children: ReactNode; className?: string; showAxes?: boolean }) {
  return (
    <div className={`kynlo-spatial-frame ${className}`}>
      {showAxes && <div className="spatial-axes" aria-hidden="true"><span className="ownership-axis">OWNERSHIP <b>→</b></span><span className="time-axis">TIME <b>↓</b></span></div>}
      {children}
    </div>
  );
}

export function TimeRail({ stages, activeKey }: { stages: Array<{ key: string; label: string }>; activeKey: string }) {
  return (
    <nav className="time-index kynlo-time-rail" aria-label="Lifecycle stages">
      {stages.map((stage, index) => (
        <span key={stage.key} className={stage.key === activeKey ? "current" : ""} aria-current={stage.key === activeKey ? "step" : undefined}>
          <i>{String(index + 1).padStart(2, "0")}</i>{stage.label}
        </span>
      ))}
    </nav>
  );
}

export function OwnershipPath({ reveal }: { reveal: number }) {
  const path = Math.round(reveal * 100);
  const style = { "--graph-reveal": reveal } as CSSProperties;
  return (
    <div className="ownership-graph kynlo-ownership-path" style={style} aria-label="Owner to Kynlo to Successors ownership path" aria-hidden={reveal < 0.95}>
      <div className="graph-owner graph-node"><span>OWNER</span><strong>0x71…2F</strong></div>
      <div className="graph-kynlo graph-node"><span>K</span><small>KYNLO</small></div>
      <svg className="graph-lines" viewBox="0 0 760 220" preserveAspectRatio="none" aria-hidden="true">
        <path className="owner-line" pathLength="100" style={{ strokeDashoffset: 100 - path }} d="M110 110 C230 110 250 110 360 110" />
        <path className="allocation allocation-60" pathLength="100" style={{ strokeDashoffset: 100 - path }} d="M400 110 C500 110 520 52 650 52" />
        <path className="allocation allocation-40" pathLength="100" style={{ strokeDashoffset: 100 - path }} d="M400 110 C500 110 520 168 650 168" />
        <circle className="transfer-marker transfer-a" cx="650" cy="52" r="4" />
        <circle className="transfer-marker transfer-b" cx="650" cy="168" r="4" />
      </svg>
      <div className="graph-successor successor-a graph-node"><span>SUCCESSOR 01</span><strong>60%</strong><small>NVDAc · AAPLc</small></div>
      <div className="graph-successor successor-b graph-node"><span>SUCCESSOR 02</span><strong>40%</strong><small>NVDAc · AAPLc</small></div>
    </div>
  );
}

export function KynloSignal({ state }: { state: KynloState }) {
  return <span className={`kynlo-signal signal-${state}`} aria-hidden="true"><i /><i /></span>;
}

export function CalmSurface({ children, active }: { children: ReactNode; active: boolean }) {
  return <div className="kynlo-calm-surface" data-calm={active}>{children}</div>;
}
