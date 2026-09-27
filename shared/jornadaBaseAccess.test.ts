import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  JORNADA_BASE_POINTS_UNLOCK,
  JORNADA_BASE_TRIAL_DAYS,
  JORNADA_BASE_TRIAL_MS,
  canEnterJornadaBase,
  resolveJornadaBaseAccess,
  toEpochMs,
  trialBannerText,
} from "./jornadaBaseAccess.ts";

const NOW = Date.parse("2026-09-27T12:00:00.000Z");

describe("jornadaBaseAccess", () => {
  it("pago gana sobre el gancho de puntos (ya es cliente)", () => {
    const a = resolveJornadaBaseAccess(
      { activeModules: ["planificacion_base"], sovereigntyPoints: 800 },
      NOW,
    );
    assert.equal(a.kind, "paid");
  });

  it("owner y pago siguen abriendo Base", () => {
    assert.equal(
      resolveJornadaBaseAccess({ email: "gilsonarevalo.leo@gmail.com" }, NOW).kind,
      "owner",
    );
    const paid = resolveJornadaBaseAccess(
      { activeModules: ["planificacion_base"] },
      NOW,
    );
    assert.equal(paid.kind, "paid");
    assert.equal(paid.allowed, true);
  });

  it("sin trial ni puntos: eligible y puede entrar a empezar", () => {
    const a = resolveJornadaBaseAccess({}, NOW);
    assert.equal(a.kind, "eligible_trial");
    assert.equal(a.allowed, false);
    assert.equal(canEnterJornadaBase({}, NOW), true);
  });

  it("trial de 7 días abre Base y cuenta días", () => {
    const startedAt = NOW - 2 * 24 * 60 * 60 * 1000;
    const a = resolveJornadaBaseAccess(
      { jornadaBaseTrialStartedAt: startedAt },
      NOW,
    );
    assert.equal(a.kind, "trial");
    assert.equal(a.allowed, true);
    assert.equal(a.daysLeft, 5);
    assert.equal(a.trialEndsAt, startedAt + JORNADA_BASE_TRIAL_MS);
    assert.match(trialBannerText(a) ?? "", /5 días/);
  });

  it("al día 8 el trial expiró y ya no entra", () => {
    const startedAt = NOW - JORNADA_BASE_TRIAL_DAYS * 24 * 60 * 60 * 1000 - 1;
    const a = resolveJornadaBaseAccess(
      { jornadaBaseTrialStartedAt: startedAt },
      NOW,
    );
    assert.equal(a.kind, "expired");
    assert.equal(a.allowed, false);
    assert.equal(canEnterJornadaBase({ jornadaBaseTrialStartedAt: startedAt }, NOW), false);
  });

  it("500 PS desbloquean Base gratis (gancho)", () => {
    const a = resolveJornadaBaseAccess({ sovereigntyPoints: 500 }, NOW);
    assert.equal(a.kind, "points");
    assert.equal(a.allowed, true);
    assert.equal(a.pointsRemaining, 0);
    assert.match(trialBannerText(a) ?? "", /500 PS/i);
  });

  it("flag earnedFree también abre, aunque los puntos bajen", () => {
    const a = resolveJornadaBaseAccess(
      { sovereigntyPoints: 12, jornadaBaseEarnedFree: true },
      NOW,
    );
    assert.equal(a.kind, "points");
    assert.equal(a.allowed, true);
  });

  it("trial vencido + 500 PS sigue abierto por el gancho", () => {
    const a = resolveJornadaBaseAccess(
      {
        jornadaBaseTrialStartedAt: NOW - JORNADA_BASE_TRIAL_MS - 10,
        sovereigntyPoints: JORNADA_BASE_POINTS_UNLOCK,
      },
      NOW,
    );
    assert.equal(a.kind, "points");
    assert.equal(a.allowed, true);
  });

  it("toEpochMs lee number, ISO y Date", () => {
    assert.equal(toEpochMs(NOW), NOW);
    assert.equal(toEpochMs(new Date(NOW)), NOW);
    assert.equal(toEpochMs("2026-09-27T12:00:00.000Z"), NOW);
    assert.equal(toEpochMs(null), null);
    assert.equal(toEpochMs(0), null);
  });
});
