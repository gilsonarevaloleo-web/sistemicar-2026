import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../../..");

describe("Casa 6 Umbral — cableado A–D", () => {
  it("App monta /limite y no redirige /umbral vivo", () => {
    const src = readFileSync(join(root, "client/src/App.tsx"), "utf8");
    assert.match(src, /path="\/limite"/);
    assert.match(src, /CasaUmbral5/);
    assert.doesNotMatch(src, /path="\/umbral">\s*<Redirect to="\/limite"/);
    assert.match(src, /path="\/umbral"/);
  });

  it("sidebar pone Oficio (5) entre Juez y Límite", () => {
    const src = readFileSync(join(root, "client/src/components/sidebar.tsx"), "utf8");
    const juez = src.indexOf('{ path: "/juez", icon: Scale, label: "Juez Serio" }');
    const oficio = src.indexOf('{ path: "/umbral/entrada", icon: Zap, label: "Oficio" }');
    const limite = src.indexOf('{ path: "/limite", icon: DoorOpen, label: "Límite" }');
    assert.ok(juez >= 0, "falta /juez");
    assert.ok(oficio >= 0, "falta Oficio en módulos");
    assert.ok(limite >= 0, "falta /limite");
    assert.ok(juez < oficio && oficio < limite, "Oficio (5) entre Juez (4) y Límite (6)");
    assert.match(src, /path: "\/umbral"/);
  });

  it("menú ofrece Casa 6 Umbral y Planeta 5 Oficio sin mezclarlos", () => {
    const src = readFileSync(join(root, "client/src/pages/menu-principal.tsx"), "utf8");
    assert.match(src, /id: "umbral-casa6"/);
    assert.match(src, /CASA 6 UMBRAL/);
    assert.match(src, /route: "\/limite"/);
    assert.match(src, /id: "oficio-casa5"/);
    assert.match(src, /PLANETA 5 OFICIO/);
    assert.match(src, /route: "\/umbral\/entrada"/);
    assert.match(src, /¿Cuánto sabes sobre tu oficio\?/);
    assert.doesNotMatch(src, /CASA 5 UMBRAL/);
    const oficio = src.indexOf('id: "oficio-casa5"');
    const umbral6 = src.indexOf('id: "umbral-casa6"');
    assert.ok(oficio >= 0 && umbral6 >= 0 && oficio < umbral6, "Oficio (5) antes de Umbral (6)");
  });

  it("la pantalla /limite es planeta 6 y no manda al Oficio", () => {
    const page = readFileSync(join(root, "client/src/pages/CasaUmbral5.tsx"), "utf8");
    assert.match(page, /PLANETA C6/);
    assert.doesNotMatch(page, /PLANETA C5/);
    assert.doesNotMatch(page, /\/umbral\/v2/);
    assert.doesNotMatch(page, /\/umbral\/entrada/);
    const prompt = readFileSync(join(root, "shared/casas/umbral5/prompt.ts"), "utf8");
    assert.match(prompt, /La Casa 6: Umbral/);
    assert.match(prompt, /Planeta 6/);
    assert.match(prompt, /No sos Oficio/);
    const consola = readFileSync(
      join(root, "client/src/components/umbral/ConsolaUmbral.tsx"),
      "utf8",
    );
    assert.match(consola, /PLANETA_OFICIO/);
    assert.match(consola, /PLANETA C5/);
    assert.match(consola, /parseOficioPracticaSearch/);
    assert.doesNotMatch(consola, /planetaActivo=\{PLANETA_UMBRAL\}/);
  });

  it("el servidor registra Casa 6 y reusa la billetera del Juez", () => {
    const src = readFileSync(join(root, "server/index.ts"), "utf8");
    assert.match(src, /registerUmbral5Routes/);
    assert.match(src, /registerOficioRoutes/);
    assert.match(src, /initUmbral5SesionesTable/);
    assert.match(src, /wallet: juezCreditWallet/);
    assert.match(src, /registerUmbralV2Routes/);
    const engine = readFileSync(join(root, "server/services/umbral5Engine.ts"), "utf8");
    assert.match(engine, /GET \/api\/casas\/umbral5\/sesiones/);
    assert.match(engine, /listarSesionesUmbral5/);
  });

  it("el gimnasio se registra sin nueva puerta y sin tocar /umbral", () => {
    const src = readFileSync(join(root, "server/index.ts"), "utf8");
    assert.match(src, /registerGimnasio6Routes/);
    assert.match(src, /initGimnasio6LibrosTable/);
    const app = readFileSync(join(root, "client/src/App.tsx"), "utf8");
    assert.match(app, /path="\/limite"/);
    assert.match(app, /path="\/umbral"/);
    assert.match(app, /path="\/oficio"/);
    assert.doesNotMatch(app, /path="\/gimnasio"/);
    const ritual = readFileSync(join(root, "shared/casas/umbral5/prompt.ts"), "utf8");
    assert.match(ritual, /¿Cuál es tu límite\?/);
    const gymPrompt = readFileSync(join(root, "shared/casas/gimnasio6/prompt.ts"), "utf8");
    assert.match(gymPrompt, /¿Cuál es tu límite\?/);
    assert.match(gymPrompt, /capa profunda/);
  });

  it("el gimnasio no se autoabre: el operador elige puerta o práctica", () => {
    const page = readFileSync(join(root, "client/src/pages/CasaUmbral5.tsx"), "utf8");
    assert.match(page, /BifurcacionPractica/);
    assert.match(page, /elegirPuerta/);
    assert.match(page, /elegirGimnasio/);
    assert.match(page, /modo === "gimnasio"/);
    assert.doesNotMatch(page, /setLibro\(abierto\)/);
    assert.doesNotMatch(page, /path="\/gimnasio"/);
  });
});
