import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

describe("useJornadaFlotaCore (paso 2 V3)", () => {
  it("el entry V3 no importa el manager monolítico en estático", () => {
    const entry = readFileSync(join(dir, "../pages/planeacionV3.tsx"), "utf8");
    assert.equal(
      entry.includes('from "@/hooks/useDesglosadorManager"'),
      false,
      "planeacionV3.tsx no debe importar useDesglosadorManager"
    );
    assert.match(entry, /useJornadaFlotaCore/);
    assert.match(entry, /lazy\(\(\) => import\("\.\/planeacionV3Session"\)\)/);
  });

  it("la sesión pesada sí carga el manager (chunk diferido)", () => {
    const session = readFileSync(join(dir, "../pages/planeacionV3Session.tsx"), "utf8");
    assert.match(session, /useDesglosadorManager/);
  });
});
