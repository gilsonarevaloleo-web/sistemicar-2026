import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubTarea, Vehicle } from "./persistence.ts";
import {
  CUPO_EXCEDE_TOPE_SEGMENTO_DESC,
  CUPO_EXCEDE_TOPE_SEGMENTO_TITLE,
  anclarContratoAlTopeSegmento,
  capContratoMsAlTope,
  capMinutosAlTopeSegmento,
  capObjetivoHoraAlTopeSegmento,
  clampVehicleRingAlTopeSegmento,
  cupoManualExcedeTopeSegmento,
  remainingTopeBudgetMin,
  resolveSegmentoTope,
  segmentoTopeFinMs,
} from "./segmentoTopeRing.ts";

/** 07:54 Lima (UTC-5) — captura: Familia 07:30–08:30 vs meta 19:42. */
const NOW_FAMILIA = Date.parse("2026-10-15T12:54:00.000Z");
const FAMILIA = { id: "fam", horaInicio: "07:30", horaFin: "08:30" };

function st(id: string, minutosCupo: number): SubTarea {
  return {
    id,
    texto: id,
    completada: false,
    creadaAt: 0,
    enDesgloseCronometro: true,
    resultadoSituacion: "pendiente",
    minutosCupo,
  };
}

describe("segmentoTopeRing", () => {
  it("el recinto Familia 07:30–08:30 es el tope, no la meta 19:42", () => {
    const tope = segmentoTopeFinMs(FAMILIA, NOW_FAMILIA);
    assert.ok(tope != null);
    const remain = remainingTopeBudgetMin(
      { activo: true, horaFinContratoMs: NOW_FAMILIA + 710 * 60_000 },
      tope,
      NOW_FAMILIA
    );
    assert.equal(remain, 36);
    assert.equal(cupoManualExcedeTopeSegmento(40, remain ?? 0), true);
    assert.equal(cupoManualExcedeTopeSegmento(20, remain ?? 0), false);
    assert.equal(cupoManualExcedeTopeSegmento(36, remain ?? 0), false);
  });

  it("resuelve el segmento del vehículo antes que el activo", () => {
    const costura = { id: "cos", horaInicio: "08:30", horaFin: "13:00" };
    const resolved = resolveSegmentoTope(
      { segmentoId: "cos" },
      FAMILIA,
      [FAMILIA, costura]
    );
    assert.equal(resolved?.id, "cos");
    assert.equal(resolved?.horaFin, "13:00");
  });

  it("anclarContrato no deja la meta más allá del recinto", () => {
    const tope = segmentoTopeFinMs(FAMILIA, NOW_FAMILIA)!;
    const far = NOW_FAMILIA + 710 * 60_000;
    const sc = anclarContratoAlTopeSegmento(
      { activo: true, horaFinMs: far, horaFinContratoMs: far },
      tope
    );
    assert.equal(sc.horaFinContratoMs, tope);
    assert.equal(sc.horaFinMs, tope);
    const already = anclarContratoAlTopeSegmento(
      { activo: true, horaFinMs: tope - 5 * 60_000, horaFinContratoMs: tope - 5 * 60_000 },
      tope
    );
    assert.equal(already.horaFinContratoMs, tope - 5 * 60_000);
  });

  it("cap en lanzamiento: 19:42 cae al fin de Familia", () => {
    const tope = segmentoTopeFinMs(FAMILIA, NOW_FAMILIA)!;
    const contrato19 = NOW_FAMILIA + 708 * 60_000;
    assert.equal(capContratoMsAlTope(contrato19, tope), tope);
    assert.equal(capMinutosAlTopeSegmento(710, tope, NOW_FAMILIA), 36);
    assert.equal(capObjetivoHoraAlTopeSegmento("19:42", FAMILIA, NOW_FAMILIA), "08:30");
    assert.equal(capObjetivoHoraAlTopeSegmento("08:10", FAMILIA, NOW_FAMILIA), "08:10");
  });

  it("clampVehicleRing recorta el desenfoque 710 → recinto", () => {
    const vehicle = {
      id: "v1",
      titulo: "Acomodar la cama",
      tipoFlota: "situacion",
      status: "activo",
      segmentoId: "fam",
      subTareas: [st("a", 710)],
      situacionCronometro: {
        activo: true,
        horaFinMs: NOW_FAMILIA + 710 * 60_000,
        horaFinContratoMs: NOW_FAMILIA + 710 * 60_000,
      },
    } as Vehicle;
    const patch = clampVehicleRingAlTopeSegmento(vehicle, FAMILIA, [FAMILIA], NOW_FAMILIA);
    assert.ok(patch);
    const tope = segmentoTopeFinMs(FAMILIA, NOW_FAMILIA);
    assert.equal(patch!.situacionCronometro?.horaFinContratoMs, tope);
    assert.equal(patch!.subTareas?.[0]?.minutosCupo, 36);
  });

  it("clamp no toca un ring que ya cabe en el recinto", () => {
    const tope = segmentoTopeFinMs(FAMILIA, NOW_FAMILIA)!;
    const vehicle = {
      id: "v1",
      titulo: "ok",
      tipoFlota: "situacion",
      status: "activo",
      segmentoId: "fam",
      subTareas: [st("a", 10), st("b", 10)],
      situacionCronometro: {
        activo: true,
        horaFinMs: tope,
        horaFinContratoMs: tope,
      },
    } as Vehicle;
    assert.equal(clampVehicleRingAlTopeSegmento(vehicle, FAMILIA, [FAMILIA], NOW_FAMILIA), null);
  });

  it("el copy pide otro vehículo, no montar el segmento", () => {
    assert.equal(CUPO_EXCEDE_TOPE_SEGMENTO_TITLE, "No te sobran minutos");
    assert.match(CUPO_EXCEDE_TOPE_SEGMENTO_DESC, /otro vehículo/i);
  });
});
