import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

describe("dualKernelQuiet soft-start", () => {
  it("exporta helper de quiet + soft-start", () => {
    const src = readFileSync(join(dir, "dualKernelQuiet.ts"), "utf8");
    assert.match(src, /useDualKernelMotorsQuiet/);
    assert.match(src, /DUAL_KERNEL_EXIT_SOFT_MS/);
    assert.match(src, /isJornada4Path/);
  });

  it("SegmentAttention y Centinela usan soft-start al salir de Dual Kernel", () => {
    const seg = readFileSync(
      join(dir, "../components/SegmentAttentionBackground.tsx"),
      "utf8"
    );
    const cen = readFileSync(
      join(dir, "../components/centinela-engine.tsx"),
      "utf8"
    );
    assert.match(seg, /useDualKernelMotorsQuiet/);
    assert.match(cen, /useDualKernelMotorsQuiet/);
    assert.equal(seg.includes("isJornada4Path(location)"), false);
    assert.equal(cen.includes("isJornada4Path(location)"), false);
  });

  it("CierreJornada y AdminGilson usan soft-start (Ring→Menú→Admin)", () => {
    const cierre = readFileSync(
      join(dir, "../components/cierre-jornada-modal.tsx"),
      "utf8"
    );
    const admin = readFileSync(join(dir, "../pages/admin-gilson.tsx"), "utf8");
    assert.match(cierre, /useDualKernelMotorsQuiet/);
    assert.match(admin, /useDualKernelMotorsQuiet/);
    assert.equal(cierre.includes("isPlanificacion"), false);
    assert.match(admin, /motorsQuiet/);
  });
});
