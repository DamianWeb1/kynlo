# Kynlo Visual System

Status: Frozen

Version: 1.0.0

The approved Kynlo frontend is the visual source of truth. New functionality must reuse this system. Backend integration replaces simulated data and actions beneath the interface. It does not reinterpret the interface.

## 1. Color tokens

The executable tokens live in `apps/web/app/kynlo-tokens.css`.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Ink | `--kynlo-ink` | `#11120f` | Primary dark surface, text, paths |
| Bone | `--kynlo-bone` | `#f1eee5` | Primary warm light surface and reversed text |
| Paper | `--kynlo-paper` | `#faf8f1` | Lifecycle surface and ownership nodes |
| Vault | `--kynlo-vault` | `#dad5c8` | Legacy Vault field |
| Signal | `--kynlo-signal` | `#b8ff36` | Active state, verified direction, controlled emphasis |
| Alert | `--kynlo-alert` | `#a7623d` | Missed Proof of Life only |
| Protected | `--kynlo-protected` | `#64665e` | Protection ring |
| Copy | `--kynlo-copy` | `#4e4f48` | Long copy on light surfaces |
| Metadata | `--kynlo-meta` family | frozen grays | Secondary technical information |

Green is a state signal, not decoration. Do not introduce gradients, glow palettes, or additional brand colors without approval.

## 2. Typography scale

| Role | Token | Approved value |
| --- | --- | --- |
| Metadata | `--kynlo-type-meta` | `.75rem` |
| Quiet metadata | `--kynlo-type-quiet` | `.72rem` |
| Action | `--kynlo-type-action` | `.78rem` |
| Body | `--kynlo-type-body` | `1rem` |
| Body large | `--kynlo-type-body-lg` | `1.08rem` |
| Intro | `--kynlo-type-intro` | `1.3rem` |
| State | `--kynlo-type-state` | `clamp(2.2rem, 4vw, 4.4rem)` |
| Section | `--kynlo-type-section` | `clamp(2.6rem, 5.2vw, 5.8rem)` |
| Hero | `--kynlo-type-hero` | `clamp(4.2rem, 10.5vw, 10.7rem)` |

Scale contrast is intentional. Do not normalize display, body, and metadata sizes into a dashboard scale.

## 3. Font roles

- Display: `--kynlo-font-display`, Georgia with Times New Roman fallback. Use for editorial headlines, lifecycle statements, asset names, and narrative copy.
- Technical: `--kynlo-font-technical`, Arial Narrow with Helvetica Neue and Arial fallbacks. Use for controls, metadata, addresses, state labels, network labels, and allocations.
- Italic display indicates continuity or resolved meaning. It is not a general emphasis style.

## 4. Spacing scale

The spacing scale runs from `--kynlo-space-1` at 4px through `--kynlo-space-14` at 64px. Page gutters use `--kynlo-gutter` at 3.5vw. Editorial section gutters use `--kynlo-section-gutter` at 6vw.

Large vertical gaps are part of the identity. New screens should remove secondary content before compressing the primary composition.

## 5. Border and radius rules

- Default radius: `--kynlo-radius-none`.
- Document radius: `--kynlo-radius-document`, 2px. Reserved for the ownership certificate.
- Round radius: `--kynlo-radius-round`. Reserved for true circles, state dots, and the Kynlo node.
- Default border: one thin structural line.
- Avoid nested bordered containers and pill-shaped labels.
- The geometric K must never be permanently enclosed in a circle.

## 6. Line weights

| Meaning | Token |
| --- | --- |
| Structural rule | `--kynlo-line-thin` |
| Protection structure | `--kynlo-line-standard` |
| Lifecycle ring | `--kynlo-line-ring` |
| Succession opening | `--kynlo-line-signal` |
| Owner path | `--kynlo-path-owner` |
| 40 percent allocation | `--kynlo-path-40` |
| 60 percent allocation | `--kynlo-path-60` |

Ownership-path thickness represents allocation. It must not be changed for visual balance alone.

## 7. Layout and grid rules

- X-axis means ownership: Owner to Kynlo to Successors.
- Y-axis means time: Active to Proof of Life to Protection to Succession.
- Desktop favors asymmetric editorial grids, large scale changes, and visible negative space.
- Marketing and explanation screens may use cinematic pinned composition.
- Transaction-critical screens must reduce motion and decoration while retaining type, color, spacing, and ownership direction.
- Cards are not the default layout primitive. Use composition, type, paths, and field separation first.

## 8. Motion durations

| Token | Duration | Purpose |
| --- | --- | --- |
| `--kynlo-motion-scroll` | 120ms | Scroll-linked path and protection updates |
| `--kynlo-motion-ring` | 180ms | Ring depletion response |
| `--kynlo-motion-state` | 200ms | Small state changes |
| `--kynlo-motion-path` | 280ms | Ownership endpoint reveal |
| `--kynlo-motion-reveal` | 450ms | Deliberate state reveal |
| `--kynlo-motion-transform` | 550ms | Ring structural transformation |
| `--kynlo-motion-pulse` | 1800ms | Proof of Life pulse |

## 9. Easing curves

- Time interpolation: `--kynlo-ease-time`, linear.
- Structural state change: `--kynlo-ease-state`, `cubic-bezier(.2, .75, .2, 1)`.
- Deliberate reveal: `--kynlo-ease-reveal`, ease.
- Proof pulse: `--kynlo-ease-pulse`, ease-out.

Do not add a new curve for a local effect. Add a system token only when a new product meaning requires it.

## 10. Interaction states

- Rest: warm off-white or ink field, no glow.
- Hover: optional reinforcement only. Never reveal required information solely on hover.
- Focus: retain browser-visible keyboard focus until a canonical Kynlo focus treatment is approved.
- Active: green signal only when the state is live or actionable.
- Pending transaction: calm surface, stable copy, no decorative motion.
- Success: settled structure and confirmed ownership direction.
- Error: alert color with direct recovery copy. Do not use alarm animation.
- Disabled: reduced contrast without hiding the label.

## 11. Lifecycle states

The four product states are Active, Proof of Life, Protection, and Succession. The homepage expands them into seven narrative phases without changing product logic:

1. Active, Today
2. Approaching, Proof of Life
3. Missed, Deadline missed
4. Nothing, Nothing moves
5. Protection, Protection Window
6. Transition, Succession Ready
7. Resolved, Ownership resolves

The final resolved state retains a genuine scroll hold before release.

## 12. Kynlo Ring states

- Active: healthy continuous ring with countdown.
- Approaching: linear depletion communicates elapsed time.
- Missed: alert-colored remainder and explicit missed state.
- Protection: independent outer progress ring and dashed protected treatment.
- Succession transition: green opening marks appear.
- Resolved: opened structure, Succession Ready label, and ownership paths fully land.

The ring is a product motif. It is never a permanent container for the Kynlo mark.

## 13. Kynlo Mark states

- Canonical asset: `/public/kynlo-mark.svg`.
- Canonical component: `KynloMark`.
- Light tone: unmodified white mark on ink surfaces.
- Ink tone: filtered mark for light surfaces.
- Geometry, proportions, and internal spacing are frozen.
- Scaling is allowed. Redrawing, rounding, outlining, or enclosing it is not.

## 14. Ownership-path rules

- Canonical component: `OwnershipPath`.
- Direction always runs left to right.
- Owner appears before Kynlo. Successors appear after Kynlo.
- Each Successor path has an allocation-derived weight.
- Path appearance means relationship or transfer progress.
- Endpoint motion settles when ownership resolves.
- Do not use the ownership graph as background decoration outside its product context.

## 15. Responsive behavior

- Desktop breakpoint: above 900px. Full three-column lifecycle and visible time rail.
- Compact breakpoint: 900px and below. Left-led story copy, offset ring, hidden rail, vertically composed Vault.
- Mobile breakpoint: 560px and below. Shorter lifecycle distance, smaller ring, full-width flat certificate, left-aligned closing statement.
- Mobile is a recomposition. Do not scale the desktop canvas uniformly.
- Do not rely on hover. Preserve tap targets, reading order, and horizontal overflow protection.

## 16. Reduced-motion behavior

- Continuous lifecycle interpolation becomes discrete state anchors.
- The complete state sequence and final hold remain.
- Smooth page scrolling is disabled.
- Ring, path, ownership, and time-rail transitions are disabled.
- Proof pulses stop.
- The Vault certificate loses its static rotation.
- Reduced motion must never remove state text or ownership meaning.

## 17. Canonical components

Implemented code components:

- `KynloMark`
- `KynloLifecycleRing`
- `SpatialFrame`
- `TimeRail`
- `OwnershipPath`
- `KynloSignal`
- `CalmSurface`

Canonical styled patterns:

- `.primary-action`, action and button language
- `.certificate`, Kynlo Vault asset presentation
- `.graph-node`, owner and Successor node language
- `.story-copy`, lifecycle and Legacy Plan narrative hierarchy
- `.kynlo-calm-surface`, Protection and transaction-critical calm state

Seal, Successor account setup, claims, wallet connection, transaction simulation, and live Legacy Plan screens extend the canonical patterns above. They must not invent parallel visual versions.

## Screen regression rule

Before completing frontend work:

1. Compare the hero, every lifecycle phase, resolved ownership graph, Legacy Vault, and closing statement against the approved screens.
2. Check desktop above 900px, compact at 900px or below, and mobile at 560px or below.
3. Check forward scroll, backward scroll, aggressive scroll, keyboard access, and reduced motion.
4. Confirm the next section stays hidden until Succession and ownership paths fully land.
5. Confirm new functionality changes data and behavior beneath the interface rather than restyling the interface.

If a feature conflicts with a frozen rule, stop before changing it. Report the rule, the reason, and every affected screen or component. Wait for approval.

## Audit findings at freeze

- The approved colors and motion values were repeated across base, lifecycle, interaction, and final-quality stylesheets.
- The Kynlo mark and lifecycle ring were local homepage functions instead of shared components.
- A compact ownership graph appeared outside its product context in the Vault and was removed before the freeze.
- The final-quality stylesheet corrected base rules through overrides. Those rules were merged into the canonical base stylesheet.
- Transaction, Seal, Legacy Plan Composer, Successor account setup, and claim screens must follow the frozen governing rules and reuse the canonical components above.
