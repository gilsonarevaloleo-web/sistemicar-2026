import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const clientSrc = join(dir, "..");
const repoRoot = join(dir, "../..");

const DEAD_CLASSIC_JORNADA = [
  "pages/planeacion.tsx",
  "pages/planeacionV3.tsx",
  "pages/planeacionV3Session.tsx",
  "hooks/useDesglosadorManager.ts",
  "hooks/useJornadaV3Ops.ts",
  "hooks/usePulsoCobertura.ts",
  "components/flota/VehicleCard.tsx",
  "components/AnilloConciencia.tsx",
  "components/AnilloConcienciaLive.tsx",
  "components/PlanificacionCockpit.tsx",
  "components/EntropiaDebugPanel.tsx",
  "components/BalanceConquistaPanel.tsx",
  "components/escalera-conciencia-card.tsx",
  "components/escalera-cierre-resumen.tsx",
  "components/jornada/MetricasJornadaModule.tsx",
  "components/jornada/PulsoCobertura.tsx",
  "components/jornada/JornadaV3SuspenseFallback.tsx",
  "lib/pulsoCoberturaCompute.ts",
  "lib/pulsoCoberturaCache.ts",
  "lib/useIslandConcienciaClock.ts",
  "lib/domConcienciaClock.ts",
];

describe("jornada clásica retirada — solo Dual Kernel (V4)", () => {
  it("no deja páginas, cards ni relojes de la jornada antigua", () => {
    for (const rel of DEAD_CLASSIC_JORNADA) {
      assert.equal(
        existsSync(join(clientSrc, rel)),
        false,
        `sobrante de jornada antigua: ${rel}`
      );
    }
    assert.equal(existsSync(join(repoRoot, "count-jornada.json")), false);
  });

  it("rutas antiguas redirigen a /jornada-v4", () => {
    const app = readFileSync(join(clientSrc, "App.tsx"), "utf8");
    assert.match(app, /path="\/planeacion"/);
    assert.match(app, /path="\/jornada-v3"/);
    assert.match(app, /path="\/planeacion-v3"/);
    assert.match(app, /Redirect to=\{JORNADA_V4_PATH\}/);
    assert.equal(app.includes('import("@/pages/planeacion")'), false);
    assert.equal(app.includes("planeacionV3"), false);
  });

  it("el skeleton de carga usa pestañas V4 y no parpadea", () => {
    const shell = readFileSync(
      join(clientSrc, "components/jornada/JornadaShell.tsx"),
      "utf8"
    );
    assert.match(shell, /"plan"/);
    assert.match(shell, /Plan/);
    assert.equal(shell.includes('"meta"'), false);
    assert.equal(shell.includes("animate-pulse"), false);
  });
});
