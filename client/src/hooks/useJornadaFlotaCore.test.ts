import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

describe("useJornadaFlotaCore (Dual Kernel)", () => {
  it("el entry V4 no importa el manager monolítico en estático", () => {
    const entry = readFileSync(join(dir, "../pages/jornadaV4.tsx"), "utf8");
    assert.equal(
      entry.includes('from "@/hooks/useDesglosadorManager"'),
      false,
      "jornadaV4.tsx no debe importar useDesglosadorManager"
    );
    assert.match(entry, /useJornada4Core/);
    assert.match(entry, /lazy\(\(\) => import\("\.\/jornadaV4Session"\)\)/);
  });

  it("la sesión V4 no importa useDesglosadorManager", () => {
    const session = readFileSync(join(dir, "../pages/jornadaV4Session.tsx"), "utf8");
    assert.equal(
      session.includes('from "@/hooks/useDesglosadorManager"'),
      false,
      "jornadaV4Session.tsx no debe importar useDesglosadorManager"
    );
    assert.match(session, /useJornada4Ops/);
    assert.match(session, /useSegmentoProyectoVinculo/);
  });

  it("useJornada4Ops no importa useDesglosadorManager", () => {
    const ops = readFileSync(join(dir, "./useJornada4Ops.ts"), "utf8");
    assert.equal(
      ops.includes('from "@/hooks/useDesglosadorManager"'),
      false,
      "useJornada4Ops.ts no debe importar useDesglosadorManager"
    );
  });

  it("useJornadaFlotaCore hace flush síncrono y rehydrate al volver", () => {
    const core = readFileSync(join(dir, "./useJornadaFlotaCore.ts"), "utf8");
    assert.match(core, /flushLocalVehicles/);
    assert.match(core, /onJornadaVisibilityReturn/);
    assert.match(core, /rehydrateFlotaFromDiskSources/);
    assert.equal(
      core.includes("saveLocalVehicles(vehiclesRef.current)"),
      false,
      "hide/pagehide no debe usar saveLocalVehicles debounced"
    );
  });
});
