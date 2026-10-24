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
  resolveClientAccountWhatsappKind,
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
    assert.equal(displayNameForPlan("deposito_matricula"), "Universidad Matrícula");
    assert.equal(displayNameForPlan("deposito_titulo"), "Universidad Título");
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

  it("WhatsApp corrige gamail.com al Gmail real", () => {
    const text = buildClientAccountWhatsapp(
      "tinapinocarrera@gamail.com",
      "Jornada Base",
    );
    assert.match(text, /tinapinocarrera@gmail\.com/);
    assert.equal(text.includes("gamail"), false);
  });

  it("WhatsApp le dice al cliente dónde crear la cuenta", () => {
    const text = buildClientAccountWhatsapp("TinaPinoCarrera@gmail.com", "Norte");
    assert.match(text, /sistemicar\.app\/acceso/);
    assert.match(text, /Continuar con Google/);
    assert.match(text, /tinapinocarrera@gmail\.com/);
    assert.match(text, /Norte/);
    assert.match(text, /crear tu cuenta/);
  });

  it("elige el WhatsApp según si la cuenta ya existe", () => {
    assert.equal(resolveClientAccountWhatsappKind({ granted: true }), "existing_granted");
    assert.equal(
      resolveClientAccountWhatsappKind({ accountExists: true }),
      "existing_pending",
    );
    assert.equal(resolveClientAccountWhatsappKind({}), "new");
  });

  it("si la cuenta ya existe, no le pide crear otra", () => {
    const granted = buildClientAccountWhatsapp(
      "tina@gmail.com",
      "Jornada Base",
      "existing_granted",
    );
    assert.match(granted, /ya está en tu cuenta/);
    assert.match(granted, /NO crees otra cuenta/);
    assert.match(granted, /jornada/);
    assert.equal(granted.includes("Para crear tu cuenta"), false);

    const pending = buildClientAccountWhatsapp(
      "tina@gmail.com",
      "Jornada Base",
      "existing_pending",
    );
    assert.match(pending, /YA existe/);
    assert.match(pending, /No crees otra/);
    assert.match(pending, /trial/);
  });

  it("mensaje admin: pendiente vs activado vs cuenta existente", () => {
    const pending = moduleGrantAdminMessage({
      email: "tina@gmail.com",
      planId: "soberania_dia",
      granted: false,
      pending: true,
    });
    assert.match(pending, /acceso/);
    assert.match(pending, /tina@gmail.com/);
    assert.match(pending, /Norte/);
    assert.match(pending, /Aún no tiene cuenta/);

    const existingPending = moduleGrantAdminMessage({
      email: "tina@gmail.com",
      planId: "planificacion_base",
      granted: false,
      pending: true,
      accountExists: true,
    });
    assert.match(existingPending, /cuenta ya existe/);
    assert.match(existingPending, /no cree otra/i);

    const granted = moduleGrantAdminMessage({
      email: "tina@gmail.com",
      planId: "soberania_dia",
      granted: true,
      pending: false,
    });
    assert.match(granted, /activado/);
    assert.match(granted, /No cree otra cuenta/);
    assert.match(granted, /desglosador de enfoque/);
  });
});
