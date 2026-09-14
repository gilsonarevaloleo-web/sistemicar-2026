import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function readFromClient(rel: string): string {
  return readFileSync(join(here, "../..", rel), "utf8");
}

describe("Depósito v1 y v2 visibles, v2 anti-freeze", () => {
  it("el menú muestra DEPÓSITO y DEPÓSITO V2 como dos ítems", () => {
    const menu = readFromClient("pages/menu-principal.tsx");
    assert.match(menu, /id: "deposito"/);
    assert.match(menu, /title: "DEPÓSITO"/);
    assert.match(menu, /id: "deposito-v2"/);
    assert.match(menu, /title: "DEPÓSITO V2"/);
    assert.match(menu, /route: "\/esperanza\/v2"/);
    const catalog = readFileSync(
      join(here, "../../../../shared/moduleCatalog.ts"),
      "utf8",
    );
    assert.doesNotMatch(catalog, /id: "deposito"/);
  });

  it("App declara /esperanza/v2 antes que /esperanza", () => {
    const src = readFromClient("App.tsx");
    const iV2 = src.indexOf('path="/esperanza/v2"');
    const iRoot = src.indexOf('path="/esperanza"');
    assert.ok(iV2 >= 0 && iRoot >= 0);
    assert.ok(iV2 < iRoot, "/esperanza/v2 debe ir antes que /esperanza");
    assert.match(src, /path="\/deposito\/v2"/);
    assert.match(src, /Redirect to="\/esperanza\/v2"/);
  });

  it("App VoiceBootstrap calla TTS en /esperanza y /deposito", () => {
    const src = readFromClient("App.tsx");
    assert.match(src, /p === "\/esperanza"/);
    assert.match(src, /p\.startsWith\("\/esperanza\/"\)/);
    assert.match(src, /p === "\/deposito"/);
  });

  it("Depósito v2 no tapa el recinto con spinner de Firestore", () => {
    const src = readFromClient("pages/deposito-v2.tsx");
    assert.match(src, /useDualKernelMotorsQuiet/);
    assert.match(src, /motorsQuiet/);
    assert.match(src, /listVolcadosLocal/);
    assert.match(src, /data-testid="deposito-v2-page"/);
    assert.match(src, /DEPÓSITO V2/);
    assert.doesNotMatch(src, /setLoading\(true\)/);
    assert.doesNotMatch(src, /if \(loading\)/);
  });

  it("Doctor IA no monta FAB en Depósito V2", () => {
    const src = readFromClient("components/doctor-ia-chat.tsx");
    assert.match(src, /"\/esperanza\/v2"/);
    assert.match(src, /location\.startsWith\("\/esperanza\/"\)/);
  });
});
