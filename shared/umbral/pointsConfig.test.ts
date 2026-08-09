import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  UMBRAL_V2_CORTE_LIMPIO_PS,
  UMBRAL_V2_MODULO_COMPLETO_PS,
  UMBRAL_V2_PS_POR_CODIGO,
  emptyUmbralV2PsLedger,
  esIntentoConscienteValido,
  resolveUmbralV2PsAwards,
} from "./pointsConfig.ts";

const DENSO =
  "Hoy corto la excusa puntual de revisar redes a las 9am y hago la llamada mínima al cliente.";

describe("Umbral v2 — pointsConfig", () => {
  it("MODOS label Forja no Espejo se valida vía tabla de códigos", () => {
    assert.equal(UMBRAL_V2_PS_POR_CODIGO[1].intento, 1);
    assert.equal(UMBRAL_V2_PS_POR_CODIGO[1].pase, 2);
    assert.equal(UMBRAL_V2_PS_POR_CODIGO[10].pase, 6);
    assert.equal(UMBRAL_V2_MODULO_COMPLETO_PS, 8);
  });

  it("esIntentoConscienteValido exige densidad", () => {
    assert.equal(esIntentoConscienteValido("corto"), false);
    assert.equal(esIntentoConscienteValido(DENSO), true);
  });

  it("primer envío denso aprobado: intento + pase + corte limpio", () => {
    const r = resolveUmbralV2PsAwards({
      modo: "INTERNO_HABILIDAD",
      codigo: 1,
      respuestaUsuario: DENSO,
      aprobado: true,
      dayKey: "2026-08-09",
    });
    assert.equal(r.total, 1 + 2 + UMBRAL_V2_CORTE_LIMPIO_PS);
    assert.deepEqual(
      r.awards.map((a) => a.kind),
      ["intento", "pase", "corte_limpio"],
    );
    assert.match(r.awards[0].source, /La Forja/);
    assert.doesNotMatch(r.awards[0].source, /Espejo/);
  });

  it("reintento mismo día: no paga intento; pase sí si aún no cobrado", () => {
    const first = resolveUmbralV2PsAwards({
      modo: "INTERNO_HABILIDAD",
      codigo: 3,
      respuestaUsuario: DENSO,
      aprobado: false,
      dayKey: "2026-08-09",
    });
    assert.equal(first.awards.length, 1);
    assert.equal(first.awards[0].kind, "intento");

    const second = resolveUmbralV2PsAwards(
      {
        modo: "INTERNO_HABILIDAD",
        codigo: 3,
        respuestaUsuario: DENSO,
        aprobado: true,
        dayKey: "2026-08-09",
      },
      first.ledger,
    );
    assert.deepEqual(
      second.awards.map((a) => a.kind),
      ["pase"],
    );
    assert.equal(second.total, UMBRAL_V2_PS_POR_CODIGO[3].pase);
  });

  it("pase no se cobra dos veces", () => {
    const a = resolveUmbralV2PsAwards({
      modo: "EXTERNO_VENTAS",
      codigo: 2,
      respuestaUsuario: DENSO,
      aprobado: true,
      dayKey: "2026-08-09",
    });
    const b = resolveUmbralV2PsAwards(
      {
        modo: "EXTERNO_VENTAS",
        codigo: 2,
        respuestaUsuario: DENSO,
        aprobado: true,
        dayKey: "2026-08-10",
      },
      a.ledger,
    );
    assert.ok(b.awards.every((x) => x.kind !== "pase"));
  });

  it("código 10 aprobado otorga módulo una vez", () => {
    const r = resolveUmbralV2PsAwards({
      modo: "EXTERNO_VENTAS",
      codigo: 10,
      respuestaUsuario: DENSO,
      aprobado: true,
      dayKey: "2026-08-09",
    });
    assert.ok(r.awards.some((a) => a.kind === "modulo"));
    assert.equal(
      r.awards.find((a) => a.kind === "modulo")?.amount,
      UMBRAL_V2_MODULO_COMPLETO_PS,
    );
    assert.match(r.awards.find((a) => a.kind === "modulo")!.source, /La Arena/);

    const again = resolveUmbralV2PsAwards(
      {
        modo: "EXTERNO_VENTAS",
        codigo: 10,
        respuestaUsuario: DENSO,
        aprobado: true,
        dayKey: "2026-08-10",
      },
      r.ledger,
    );
    assert.ok(!again.awards.some((a) => a.kind === "modulo"));
  });

  it("escritura corta: sin intento ni corte; pase sí si aprueba", () => {
    const r = resolveUmbralV2PsAwards({
      modo: "INTERNO_HABILIDAD",
      codigo: 1,
      respuestaUsuario: "ok",
      aprobado: true,
      dayKey: "2026-08-09",
    });
    assert.deepEqual(
      r.awards.map((a) => a.kind),
      ["pase"],
    );
  });

  it("empty ledger es estable", () => {
    const e = emptyUmbralV2PsLedger();
    assert.equal(e.version, 1);
    assert.equal(e.pasesCobrados.length, 0);
  });
});
