import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  armDualKernelExitSoftStart,
  isDualKernelExitSoftActive,
  resetDualKernelExitSoftForTests,
  DUAL_KERNEL_EXIT_SOFT_MS,
  DUAL_KERNEL_HUB_EXIT_SOFT_MS,
} from "./dualKernelQuiet";

const dir = dirname(fileURLToPath(import.meta.url));

describe("dualKernelQuiet soft-start", () => {
  beforeEach(() => {
    resetDualKernelExitSoftForTests();
  });

  afterEach(() => {
    resetDualKernelExitSoftForTests();
  });

  it("exporta helper de quiet + soft-start compartido", () => {
    const src = readFileSync(join(dir, "dualKernelQuiet.ts"), "utf8");
    assert.match(src, /useDualKernelMotorsQuiet/);
    assert.match(src, /DUAL_KERNEL_EXIT_SOFT_MS/);
    assert.match(src, /DUAL_KERNEL_HUB_EXIT_SOFT_MS/);
    assert.match(src, /armDualKernelExitSoftStart/);
    assert.match(src, /isDualKernelExitSoftActive/);
    assert.match(src, /isJornada4Path/);
    assert.match(src, /isProyectosHubPath/);
    // Latch compartido: no depender solo de useState local por instancia.
    assert.match(src, /useSyncExternalStore/);
    assert.match(src, /isDualKernelExitSoftActive\(\)/);
  });

  it("armDualKernelExitSoftStart activa el latch síncronamente", () => {
    assert.equal(isDualKernelExitSoftActive(), false);
    armDualKernelExitSoftStart();
    assert.equal(isDualKernelExitSoftActive(), true);
    assert.ok(DUAL_KERNEL_EXIT_SOFT_MS >= 1_000);
  });

  it("Hub Proyectos usa soft-start más largo que el default", () => {
    assert.ok(DUAL_KERNEL_HUB_EXIT_SOFT_MS > DUAL_KERNEL_EXIT_SOFT_MS);
    armDualKernelExitSoftStart({ href: "/proyectos" });
    assert.equal(isDualKernelExitSoftActive(), true);
    // No acortar: un arm genérico no debe reducir la ventana Hub.
    const before = Date.now();
    armDualKernelExitSoftStart();
    assert.ok(isDualKernelExitSoftActive());
    assert.ok(Date.now() - before < DUAL_KERNEL_HUB_EXIT_SOFT_MS);
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
    assert.match(seg, /isProyectosHubPath/);
    assert.match(cen, /isProyectosHubPath/);
    assert.match(seg, /CLOCK_MS_IDLE/);
    assert.match(cen, /CENTINELA_UI_MS_HUB/);
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
    assert.match(admin, /motorsQuiet/);
  });

  it("NavTransitionLink arma soft-start ANTES de salir de Dual Kernel", () => {
    const nav = readFileSync(
      join(dir, "../components/NavTransitionLink.tsx"),
      "utf8"
    );
    assert.match(nav, /armDualKernelExitSoftStart/);
    assert.match(nav, /isJornada4WindowPath/);
    assert.match(nav, /href/);
    // Orden de llamadas en el onClick (no imports).
    const onClickBlock = nav.slice(nav.indexOf("onClick={() => {"));
    const armIdx = onClickBlock.indexOf("armDualKernelExitSoftStart");
    const beginIdx = onClickBlock.indexOf("beginViewTransition()");
    assert.ok(armIdx >= 0, "falta armDualKernelExitSoftStart() en onClick");
    assert.ok(beginIdx > armIdx, "arm debe ir antes de beginViewTransition en onClick");
  });

  it("Espejo y Menú difieren Firebase con motorsQuiet", () => {
    const espejo = readFileSync(join(dir, "../pages/espejo.tsx"), "utf8");
    const menu = readFileSync(join(dir, "../pages/menu-principal.tsx"), "utf8");
    assert.match(espejo, /useDualKernelMotorsQuiet/);
    assert.match(espejo, /motorsQuiet/);
    assert.match(menu, /useDualKernelMotorsQuiet/);
    assert.match(menu, /motorsQuiet/);
  });

  it("Hub Proyectos difiere Firestore y aligera apertura de detalle", () => {
    const hub = readFileSync(join(dir, "../pages/proyectos.tsx"), "utf8");
    assert.match(hub, /useDualKernelMotorsQuiet/);
    assert.match(hub, /motorsQuiet/);
    assert.match(hub, /if \(!user \|\| motorsQuiet\) return/);
    assert.match(hub, /getProyectosLocal/);
    assert.match(hub, /detailHeavyReady/);
    assert.match(hub, /openProyectoDetalle/);
    assert.match(hub, /startTransition/);
  });
});
