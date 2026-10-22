import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../../..");

describe("Casa 5 Umbral — cableado A–D", () => {
  it("App monta /limite y no redirige /umbral vivo", () => {
    const src = readFileSync(join(root, "client/src/App.tsx"), "utf8");
    assert.match(src, /path="\/limite"/);
    assert.match(src, /CasaUmbral5/);
    assert.doesNotMatch(src, /path="\/umbral">\s*<Redirect to="\/limite"/);
    assert.match(src, /path="\/umbral"/);
  });

  it("sidebar pone Límite junto al Juez", () => {
    const src = readFileSync(join(root, "client/src/components/sidebar.tsx"), "utf8");
    const juez = src.indexOf('{ path: "/juez", icon: Scale, label: "Juez Serio" }');
    const limite = src.indexOf('{ path: "/limite", icon: DoorOpen, label: "Límite" }');
    assert.ok(juez >= 0, "falta /juez");
    assert.ok(limite >= 0, "falta /limite");
    assert.ok(juez < limite, "/limite debe ir después de /juez");
    assert.match(src, /path: "\/umbral"/);
  });

  it("menú ofrece Casa 5 sin tocar el tile de Umbral V2", () => {
    const src = readFileSync(join(root, "client/src/pages/menu-principal.tsx"), "utf8");
    assert.match(src, /id: "umbral-casa5"/);
    assert.match(src, /route: "\/limite"/);
    assert.match(src, /route: "\/umbral\/v2"/);
  });

  it("el servidor registra Casa 5 y reusa la billetera del Juez", () => {
    const src = readFileSync(join(root, "server/index.ts"), "utf8");
    assert.match(src, /registerUmbral5Routes/);
    assert.match(src, /initUmbral5SesionesTable/);
    assert.match(src, /wallet: juezCreditWallet/);
    assert.match(src, /registerUmbralV2Routes/);
  });
});
