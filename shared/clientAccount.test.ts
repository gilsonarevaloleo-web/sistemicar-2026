import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLIENT_ACCESO_PATH,
  CLIENT_ACCESO_PUBLIC_URL,
  accesoUrlWithNext,
  buildClientAccountWhatsapp,
  buildGrantDeliveryId,
  displayNameForPlan,
  moduleGrantAdminMessage,
  safePostLoginPath,
} from "./clientAccount.ts";

describe("clientAccount — dónde se crea la cuenta", () => {
  it("la cuenta vive en /acceso, no en el checkout", () => {
    assert.equal(CLIENT_ACCESO_PATH, "/acceso");
    assert.match(CLIENT_ACCESO_PUBLIC_URL, /sistemicar\.app\/acceso/);
  });

  it("nombres comerciales de planes de planificación", () => {
    assert.equal(displayNameForPlan("soberania_dia"), "Norte");
    assert.equal(displayNameForPlan("operativo"), "Ritmo del día");
    assert.equal(displayNameForPlan("planificacion_base"), "Jornada Base");
  });

  it("rechaza next= abierto o absoluto", () => {
    assert.equal(safePostLoginPath("https://evil.test"), "/menu");
    assert.equal(safePostLoginPath("//evil.test"), "/menu");
    assert.equal(safePostLoginPath("/pagos"), "/pagos");
    assert.equal(safePostLoginPath(null), "/menu");
  });

  it("arma /acceso?next= solo para rutas internas", () => {
    assert.equal(accesoUrlWithNext("/pagos"), "/acceso?next=%2Fpagos");
    assert.equal(accesoUrlWithNext("https://evil.test"), "/acceso");
  });

  it("delivery id usa referencia para no duplicar el mismo Yape", () => {
    assert.equal(buildGrantDeliveryId("YAPE", "Yape 02/06 S/ 129"), "yape:Yape_02_06_S__129");
    assert.equal(buildGrantDeliveryId("manual", undefined, 100), "manual:100");
  });

  it("WhatsApp le dice al cliente dónde crear la cuenta", () => {
    const text = buildClientAccountWhatsapp("TinaPinoCarrera@gmail.com", "Norte");
    assert.match(text, /sistemicar\.app\/acceso/);
    assert.match(text, /Continuar con Google/);
    assert.match(text, /tinapinocarrera@gmail\.com/);
    assert.match(text, /Norte/);
  });

  it("mensaje admin: pendiente vs activado", () => {
    const pending = moduleGrantAdminMessage({
      email: "tina@gmail.com",
      planId: "soberania_dia",
      granted: false,
      pending: true,
    });
    assert.match(pending, /acceso/);
    assert.match(pending, /tina@gmail.com/);
    assert.match(pending, /Norte/);

    const granted = moduleGrantAdminMessage({
      email: "tina@gmail.com",
      planId: "soberania_dia",
      granted: true,
      pending: false,
    });
    assert.match(granted, /activado/);
  });
});
