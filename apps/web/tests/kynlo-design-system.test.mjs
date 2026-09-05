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

  assert.match(page, /raw < 0\.82/);
  assert.match(page, /timeline >= 0\.96 \? 0\.98/);
  assert.match(page, /progress >= 0\.96 \? 1/);
});
