import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAppShellQuietPath,
  isCommercialEntryPath,
  isHouseRecintoPath,
  isJornada4Path,
  JORNADA_V4_PATH,
} from "./jornadaBrand.ts";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

describe("jornadaBrand", () => {
  it("detecta /jornada-v4 y query", () => {
    assert.equal(isJornada4Path(JORNADA_V4_PATH), true);
    assert.equal(isJornada4Path("/jornada-v4?x=1"), true);
    assert.equal(isJornada4Path("/planeacion"), false);
    assert.equal(isJornada4Path("/jornada-v3"), false);
    assert.equal(isJornada4Path("/menu"), false);
  });

  it("landing de anuncio es entrada comercial y calla el shell", () => {
    assert.equal(isCommercialEntryPath("/ventas-jornada"), true);
    assert.equal(isCommercialEntryPath("/ventas-jornada?utm_source=facebook"), true);
    assert.equal(isCommercialEntryPath("/vendedor?planeta=JORNADA"), true);
    assert.equal(isCommercialEntryPath("/pagos"), false);
    assert.equal(isAppShellQuietPath("/ventas-jornada"), true);
    assert.equal(isAppShellQuietPath("/menu"), true);
  });

  it("casas de escritura/consola callan el shell (no 10 webs: 10 recintos quietos)", () => {
    assert.equal(isAppShellQuietPath("/esperanza"), true);
    assert.equal(isAppShellQuietPath("/deposito"), true);
    assert.equal(isAppShellQuietPath("/espejo"), true);
    assert.equal(isAppShellQuietPath("/espejo/v2"), true);
    assert.equal(isAppShellQuietPath("/umbral/v2"), true);
    assert.equal(isAppShellQuietPath("/alquimia"), true);
    assert.equal(isAppShellQuietPath("/proyector"), true);
    assert.equal(isHouseRecintoPath("/esperanza"), true);
    assert.equal(isHouseRecintoPath("/menu"), false);
    assert.equal(isAppShellQuietPath("/analytics"), false);
    assert.equal(isAppShellQuietPath("/historial"), false);
  });

  it("CTAs de /ventas-jornada son <a href> nativos, no Link de SPA", () => {
    const src = readFileSync(join(dir, "../pages/ventas-jornada.tsx"), "utf8");
    assert.equal(src.includes('from "wouter"'), false);
    assert.match(src, /<a\s+href=\{vendedorHref\}/);
    assert.match(src, /<a\s+href=\{pagosHref\}/);
    assert.match(src, /touch-manipulation/);
  });
});
