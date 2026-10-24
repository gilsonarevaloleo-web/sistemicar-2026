import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

describe("admin-gilson — pestañas táctiles", () => {
  it("abre Módulos por defecto y las pestañas son type=button", () => {
    const src = readFileSync(join(dir, "admin-gilson.tsx"), "utf8");
    assert.match(src, /tabFromUrl/);
    assert.match(src, /return "modulos"/);
    assert.match(src, /goToTab\("modulos"\)/);
    assert.match(src, /type="button"/);
    assert.match(src, /touch-manipulation/);
    assert.match(src, /unlockAdminTouches/);
  });

  it("enciende Jornada Base en el UID, no migra a Gilson", () => {
    const src = readFileSync(join(dir, "admin-gilson.tsx"), "utf8");
    assert.match(src, /Encender Jornada Base/);
    assert.match(src, /\/api\/admin\/modules\/grant-uid/);
    assert.match(src, /grantModulesToUid/);
    assert.match(src, /Copiar a tu Gilson/);
    assert.match(src, /no copies los datos a tu cuenta Gilson/);
    assert.match(src, /Encender \$\{displayNameForPlan\(modulePlanId\)\} en este UID/);
    assert.match(src, /searchAccounts\(\{ silent: true \}\)/);
    assert.match(src, /Pega el correo del pago y pulsa Registrar/);
    assert.match(src, /`Registrar \$\{displayNameForPlan\(modulePlanId\)\}`/);
    assert.match(src, /Norte \(incluye Base \+ Ritmo\)/);
    assert.match(src, /admin-norte-enfoque-hint/);
    assert.match(src, /planGrantStillNeeded/);
    assert.match(src, /Encender \$\{displayNameForPlan\(modulePlanId\)\}/);
    assert.doesNotMatch(src, /El servidor no puede buscar en Firebase\. Revisa FIREBASE_SERVICE_ACCOUNT_JSON/);
  });

  it("muestra PS (no solo CP) y marca la cuenta llena para no apretar Encender a ciegas", () => {
    const src = readFileSync(join(dir, "admin-gilson.tsx"), "utf8");
    assert.match(src, /c\.sovereigntyPoints\} PS · \{c\.totalCP\} CP/);
    assert.match(src, /ESTA ES LA LLENA/);
    assert.match(src, /button-restore-highest-modulos/);
    assert.match(src, /Encender no recupera datos/);
    assert.match(src, /Los 9000 están en PS/);
  });
});
