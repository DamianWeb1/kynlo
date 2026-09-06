import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("loads the frozen Kynlo token layer globally", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const tokens = await readFile(new URL("../app/kynlo-tokens.css", import.meta.url), "utf8");

  assert.match(layout, /import "\.\/kynlo-base\.css"/);
  assert.match(layout, /import "\.\/kynlo-tokens\.css"/);
  assert.match(tokens, /--kynlo-system-version:\s*"1\.0\.0"/);
  assert.match(tokens, /--kynlo-ink:\s*#11120f/);
  assert.match(tokens, /--kynlo-bone:\s*#f1eee5/);
  assert.match(tokens, /--kynlo-signal:\s*#b8ff36/);
  assert.match(tokens, /--kynlo-ease-state:\s*cubic-bezier\(\.2, \.75, \.2, 1\)/);
});

test("exports the canonical Kynlo visual components", async () => {
  const registry = await readFile(new URL("../components/kynlo/index.ts", import.meta.url), "utf8");

  for (const component of ["KynloMark", "KynloLifecycleRing", "SpatialFrame", "TimeRail", "OwnershipPath", "KynloSignal", "CalmSurface"]) {
    assert.match(registry, new RegExp(`\\b${component}\\b`));
  }
});

test("keeps the lifecycle final hold contract", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /raw < 0\.88/);
  assert.match(page, /timeline >= 0\.96 \? 0\.98/);
  assert.match(page, /progress >= 0\.96 \? 1/);
});

test("uses the Kynlo asset register instead of a native browser select", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(page, /<select/);
  assert.match(page, /className="asset-select-trigger"/);
  assert.match(page, /role="listbox"/);
  assert.match(page, /aria-selected=/);
});

test("reserves a separate lifecycle band for the resolved ownership graph", async () => {
  const lifecycle = await readFile(new URL("../app/lifecycle.css", import.meta.url), "utf8");

  assert.match(lifecycle, /ownership-graph\{[^}]*-36px/);
  assert.match(lifecycle, /ownership-graph\{width:min\(92vw,680px\);bottom:-20px\}/);
});

test("supports email and wallet Kynlo accounts with verified email", async () => {
  const provider = await readFile(new URL("../components/kynlo/kynlo-account-provider.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const access = await readFile(new URL("../components/kynlo/account-access.tsx", import.meta.url), "utf8");

  assert.match(layout, /projectId=\{cdpProjectId\}/);
  assert.match(provider, /createOnLogin:\s*"smart"/);
  assert.match(provider, /authMethods:\s*\["email",\s*"siwe:base"\]/);
  assert.match(access, /useSignInWithEmail/);
  assert.match(access, /useSignInWithSiwe/);
  assert.match(access, /useLinkEmail/);
  assert.match(access, /Wallet verified\. Add your email/);
});

test("assigns Successors without a pre-Seal approval transaction", async () => {
  const composer = await readFile(new URL("../components/kynlo/base-sepolia-beta.tsx", import.meta.url), "utf8");

  assert.match(composer, /CONTACT EMAIL · OPTIONAL/);
  assert.match(composer, /WALLET SETUP REQUIRED/);
  assert.match(composer, /Assigned Successors do not approve the plan/);
  assert.doesNotMatch(composer, /acceptSuccessor/);
  assert.doesNotMatch(composer, /ACCEPT AS CONNECTED WALLET/);
});
