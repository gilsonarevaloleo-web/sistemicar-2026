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
    assert.match(src, /useAppShellMotorsQuiet/);
    assert.match(src, /DUAL_KERNEL_EXIT_SOFT_MS/);
    assert.match(src, /DUAL_KERNEL_HUB_EXIT_SOFT_MS/);
    assert.match(src, /armDualKernelExitSoftStart/);
    assert.match(src, /isDualKernelExitSoftActive/);
    assert.match(src, /isJornada4Path/);
    assert.match(src, /isAppShellQuietPath/);
    // Latch compartido: no depender solo de useState local por instancia.
    assert.match(src, /useSyncExternalStore/);
    assert.match(src, /isDualKernelExitSoftActive\(\)/);
  });

  it("Centro de Comando (/menu) calla motores del shell como Hub Proyectos", () => {
    const src = readFileSync(join(dir, "dualKernelQuiet.ts"), "utf8");
    const brand = readFileSync(join(dir, "jornadaBrand.ts"), "utf8");
    const app = readFileSync(join(dir, "../App.tsx"), "utf8");
    assert.match(brand, /isMenuPrincipalPath/);
    assert.match(brand, /isAppShellQuietPath/);
    assert.match(src, /isAppShellQuietPath\(location\)/);
    // VoiceBootstrap: primer toque en /menu no debe despertar TTS/GPS.
    assert.match(app, /p === "\/menu"/);
  });

  it("armDualKernelExitSoftStart activa el latch síncronamente", () => {
    assert.equal(isDualKernelExitSoftActive(), false);
    armDualKernelExitSoftStart();
    assert.equal(isDualKernelExitSoftActive(), true);
    assert.ok(DUAL_KERNEL_EXIT_SOFT_MS >= 1_000);
  });

  it("Hub Proyectos y /menu usan soft-start más largo que el default", () => {
    assert.ok(DUAL_KERNEL_HUB_EXIT_SOFT_MS > DUAL_KERNEL_EXIT_SOFT_MS);
    armDualKernelExitSoftStart({ href: "/proyectos" });
    assert.equal(isDualKernelExitSoftActive(), true);
    // No acortar: un arm genérico no debe reducir la ventana Hub.
    const before = Date.now();
    armDualKernelExitSoftStart();
    assert.ok(isDualKernelExitSoftActive());
    assert.ok(Date.now() - before < DUAL_KERNEL_HUB_EXIT_SOFT_MS);

    resetDualKernelExitSoftForTests();
    armDualKernelExitSoftStart({ href: "/menu" });
    assert.equal(isDualKernelExitSoftActive(), true);
  });

  it("SegmentAttention, Centinela y Cierre callan en Hub vía useAppShellMotorsQuiet", () => {
    const seg = readFileSync(
      join(dir, "../components/SegmentAttentionBackground.tsx"),
      "utf8"
    );
    const cen = readFileSync(
      join(dir, "../components/centinela-engine.tsx"),
      "utf8"
    );
    const cierre = readFileSync(
      join(dir, "../components/cierre-jornada-modal.tsx"),
      "utf8"
    );
    assert.match(seg, /useAppShellMotorsQuiet/);
    assert.match(cen, /useAppShellMotorsQuiet/);
    assert.match(cierre, /useAppShellMotorsQuiet/);
    assert.equal(seg.includes("useDualKernelMotorsQuiet"), false);
    assert.equal(cen.includes("useDualKernelMotorsQuiet"), false);
  });

  it("AdminGilson usa soft-start (Ring→Menú→Admin)", () => {
    const admin = readFileSync(join(dir, "../pages/admin-gilson.tsx"), "utf8");
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

  it("Hub Proyectos abre detalle síncrono y siembra estado local", () => {
    const hub = readFileSync(join(dir, "../pages/proyectos.tsx"), "utf8");
    assert.match(hub, /useDualKernelMotorsQuiet/);
    assert.match(hub, /motorsQuiet/);
    assert.match(hub, /if \(!user \|\| motorsQuiet\) return/);
    assert.match(hub, /getProyectosLocal/);
    assert.match(hub, /detailHeavyReady/);
    assert.match(hub, /openProyectoDetalle/);
    assert.match(hub, /applyDetailState\(localP/);
    // Crítico: no diferir el navigate con startTransition (nunca pintaba con hilo saturado).
    const openBlock = hub.slice(hub.indexOf("const openProyectoDetalle"));
    const openFn = openBlock.slice(0, openBlock.indexOf("const stats"));
    assert.equal(openFn.includes("startTransition(()"), false);
    assert.match(openFn, /navigate\(`\/proyectos\?id=/);
  });
});
