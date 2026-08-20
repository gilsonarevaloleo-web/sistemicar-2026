import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("Umbral v2 anti-freeze nav", () => {
  it("App VoiceBootstrap calla TTS en /umbral/*", () => {
    const src = readFileSync(join(here, "../../App.tsx"), "utf8");
    assert.match(src, /p === "\/umbral"/);
    assert.match(src, /p\.startsWith\("\/umbral\/"\)/);
  });

  it("rutas /umbral/v2 y /metricas van antes que /umbral", () => {
    const src = readFileSync(join(here, "../../App.tsx"), "utf8");
    const iV2 = src.indexOf('path="/umbral/v2"');
    const iRoot = src.indexOf('path="/umbral"');
    // La ocurrencia de path="/umbral" del root debe ser la última entre v2/entrada/metricas/root
    assert.ok(iV2 >= 0 && iRoot >= 0);
    assert.ok(iV2 < iRoot, "/umbral/v2 debe declararse antes que /umbral");
  });

  it("UmbralV2 difiere Firestore con Dual Kernel soft-start", () => {
    const src = readFileSync(join(here, "../../pages/umbral-v2.tsx"), "utf8");
    assert.match(src, /useDualKernelMotorsQuiet/);
    assert.match(src, /motorsQuiet/);
    assert.match(src, /subscribeToProgression/);
  });

  it("Doctor IA no monta FAB en consola Umbral", () => {
    const src = readFileSync(
      join(here, "../../components/doctor-ia-chat.tsx"),
      "utf8",
    );
    assert.match(src, /\/umbral\/v2/);
    assert.match(src, /location\.startsWith\("\/umbral\/"\)/);
  });
});
