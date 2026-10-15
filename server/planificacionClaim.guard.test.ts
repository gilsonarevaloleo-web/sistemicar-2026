import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

describe("activación de módulos — no hay cuenta hasta /acceso", () => {
  it("claim-module solo aplica compras pendientes del correo logueado", () => {
    const src = readFileSync(join(dir, "index.ts"), "utf8");
    assert.match(src, /claimPlanificacionPurchasesHandler/);
    assert.match(src, /grantPendingModulesForEmail/);
    assert.doesNotMatch(
      src,
      /activateModulesForUserById\(\s*verified\.uid,\s*planId/,
    );
  });

  it("admin grant ya no falla si el cliente aún no está en Firebase", () => {
    const src = readFileSync(join(dir, "index.ts"), "utf8");
    assert.match(src, /adminGrantPlanificacionModule/);
    assert.match(src, /clientWhatsapp/);
    assert.match(src, /sistemicar\.app\/acceso/);
  });

  it("el WhatsApp de admin no le pide crear otra cuenta", () => {
    const src = readFileSync(join(dir, "index.ts"), "utf8");
    assert.match(src, /resolveClientAccountWhatsappKind/);
    assert.match(src, /accountExists: true/);
  });
});

describe("claim de compras — aliases de Gmail", () => {
  it("lista grants pendientes por aliases, no solo el string exacto", () => {
    const grants = readFileSync(join(dir, "planificacionModuleGrants.ts"), "utf8");
    assert.match(grants, /emailMatchKeys/);
    assert.match(grants, /buyer_email = ANY/);
  });

  it("si Admin no escribe Firestore, el claim pasa el plan al celular", () => {
    const grants = readFileSync(join(dir, "planificacionModuleGrants.ts"), "utf8");
    assert.match(grants, /clientApplyPlans/);
    const src = readFileSync(join(dir, "index.ts"), "utf8");
    assert.match(src, /applyOnClient/);
    assert.match(src, /confirm-client-apply/);
    assert.match(src, /FIREBASE_SERVICE_ACCOUNT_JSON/);
  });

  it("el pago pendiente de pinocarreratina se pega a tinapinocarrera", () => {
    const grants = readFileSync(join(dir, "planificacionModuleGrants.ts"), "utf8");
    assert.match(grants, /gmailLocalAnagram/);
    const admin = readFileSync(join(dir, "firebaseAdmin.ts"), "utf8");
    assert.match(admin, /suggestUsersForEmail/);
    assert.match(admin, /listAuthClientsWithProgression/);
  });

  it("el claim pega un pago huérfano si el Gmail no coincide", () => {
    const grants = readFileSync(join(dir, "planificacionModuleGrants.ts"), "utf8");
    assert.match(grants, /listOrphanPendingModuleGrants/);
    assert.match(grants, /listClaimableModuleGrants/);
    assert.match(grants, /listReplayableGrantedPlans/);
    const src = readFileSync(join(dir, "index.ts"), "utf8");
    assert.match(src, /listClaimableModuleGrants/);
    assert.doesNotMatch(
      src,
      /pendingBefore\.length === 0/,
    );
  });

  it("el admin enciende el plan por UID aunque el Gmail no coincida", () => {
    const src = readFileSync(join(dir, "index.ts"), "utf8");
    assert.match(src, /\/api\/admin\/modules\/grant-uid/);
    assert.match(src, /adminGrantPlanificacionModuleByUid/);
    const grants = readFileSync(join(dir, "planificacionModuleGrants.ts"), "utf8");
    assert.match(grants, /adminGrantPlanificacionModuleByUid/);
    assert.match(grants, /listPendingModuleGrantsForUid/);
    const admin = readFileSync(join(dir, "firebaseAdmin.ts"), "utf8");
    assert.match(admin, /collectionGroup\("progression"\)/);
  });
});
