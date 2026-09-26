import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function readFromClient(rel: string): string {
  return readFileSync(join(here, "../..", rel), "utf8");
}

describe("Depósito v2 visible y anti-freeze nav", () => {
  it("el menú ofrece un solo Espejo: la consola V2", () => {
    const menu = readFromClient("pages/menu-principal.tsx");
    assert.match(menu, /route: "\/espejo\/v2"/);
    assert.doesNotMatch(menu, /id: "espejo-v2"/);
    assert.doesNotMatch(menu, /title: "ESPEJO V2"/);
    assert.doesNotMatch(menu, /Vaciado mental/);
    const app = readFromClient("App.tsx");
    assert.match(app, /Redirect to="\/espejo\/v2"/);
    assert.doesNotMatch(app, /import\("@\/pages\/espejo"\)/);
  });

  it("el menú muestra DEPÓSITO V2 como ítem de primera (no En camino)", () => {
    const menu = readFromClient("pages/menu-principal.tsx");
    assert.match(menu, /id: "deposito-v2"/);
    assert.match(menu, /title: "DEPÓSITO V2"/);
    assert.match(menu, /route: "\/esperanza"/);
    const catalog = readFileSync(
      join(here, "../../../../shared/moduleCatalog.ts"),
      "utf8",
    );
    assert.doesNotMatch(catalog, /id: "deposito"/);
  });

  it("el menú empaqueta los módulos en camino en un solo ítem", () => {
    const menu = readFromClient("pages/menu-principal.tsx");
    assert.match(menu, /PAQUETE_EN_CAMINO/);
    assert.match(menu, /modulosLiberados/);
    assert.match(menu, /modulosEnCamino/);
    assert.doesNotMatch(menu, /for \(const mod of MODULOS_EN_CAMINO\)/);
    const app = readFromClient("App.tsx");
    assert.match(app, /path="\/en-camino"/);
  });

  it("App VoiceBootstrap calla TTS en /esperanza y /deposito", () => {
    const src = readFromClient("App.tsx");
    assert.match(src, /p === "\/esperanza"/);
    assert.match(src, /p\.startsWith\("\/esperanza\/"\)/);
    assert.match(src, /p === "\/deposito"/);
  });

  it("/deposito redirige a /esperanza", () => {
    const src = readFromClient("App.tsx");
    const iAlias = src.indexOf('path="/deposito"');
    const iRoot = src.indexOf('path="/esperanza"');
    assert.ok(iAlias >= 0 && iRoot >= 0);
    assert.ok(iAlias < iRoot, "/deposito debe declararse junto a /esperanza");
    assert.match(src, /Redirect to="\/esperanza"/);
  });

  it("Depósito v2 no tapa el recinto con spinner de Firestore", () => {
    const src = readFromClient("pages/esperanza.tsx");
    assert.match(src, /useDualKernelMotorsQuiet/);
    assert.match(src, /motorsQuiet/);
    assert.match(src, /listVolcadosLocal/);
    assert.match(src, /data-testid="deposito-v2-page"/);
    assert.match(src, /DEPÓSITO V2/);
    assert.match(src, /DiagnosticoUniversidad/);
    assert.match(src, /procesarVolcadoRemoto/);
    assert.match(src, /FormularioVolcadoExpansivo/);
    assert.match(src, /evaluarRitualPasoGrado/);
    assert.match(src, /deposito-ritual-progreso/);
    assert.match(src, /progresoRitualPaso/);
    assert.doesNotMatch(src, /ritualPaso\.motivo/);
    assert.doesNotMatch(src, /pendiente de implementación/);
    assert.match(src, /params.get\("grado"\)/);
    assert.match(src, /formRef/);
    assert.match(src, /getCaptura/);
    assert.match(src, /requestIdleCallback/);
    assert.match(src, /BannerMeritoDetectado/);
    assert.match(src, /deposito-header-mapa-calor/);
    assert.match(src, /planGuardadoVolcado/);
    assert.match(src, /waitForRemote: plan.esperarFirebase/);
    assert.match(src, /disabled=\{saving && grado !== 1\}/);
    assert.doesNotMatch(src, /setLoading\(true\)/);
    assert.doesNotMatch(src, /if \(loading\)/);
    assert.doesNotMatch(src, /path="\/esperanza\/grado/);
    assert.doesNotMatch(src, /onChange=\{setCaptura\}/);
  });

  it("App carga Depósito (y las otras casas) en chunk lazy, no en el bundle inicial", () => {
    const src = readFromClient("App.tsx");
    assert.match(src, /lazyWithRetry\(\(\) => import\("@\/pages\/esperanza"\)\)/);
    assert.match(src, /lazyWithRetry\(\(\) => import\("@\/pages\/espejo-v2"\)\)/);
    assert.match(src, /lazyWithRetry\(\(\) => import\("@\/pages\/umbral-v2"\)\)/);
    assert.match(src, /HouseRouteFallback/);
    assert.doesNotMatch(src, /import Esperanza from/);
  });

  it("el volcado escribe en estado local: cada tecla no re-renderiza Esperanza", () => {
    const src = readFromClient("components/deposito/FormularioVolcadoExpansivo.tsx");
    assert.match(src, /useState<CapturaVolcadoExpansiva>/);
    assert.match(src, /useImperativeHandle/);
    assert.match(src, /getCaptura/);
    assert.doesNotMatch(src, /onChange\?\.\(/);
    assert.doesNotMatch(src, /onChange\(/);
  });

  it("Doctor IA no monta FAB en Depósito", () => {
    const src = readFromClient("components/doctor-ia-chat.tsx");
    assert.match(src, /"\/esperanza"/);
    assert.match(src, /location\.startsWith\("\/esperanza"\)/);
  });
});
