import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendVehiculoPausa,
  closeVehiculoPausaAbierta,
  isParentCoveragePaused,
  isPausedPresence,
  labelVehiculoPausaAbierta,
  minutosPausa,
  nombrePausa,
  PAUSA_INTERRUPCION_TITULO,
  pausaAbiertaSinNombrar,
  tituloPausaAbierta,
  tituloPausaInterrupcion,
  conquistaPauseAction,
  conquistaPauseActionIsNewer,
  conquistaSessionPauseRank,
  pickConquistaSessionPauseSource,
} from "./vehiculoPausa.ts";

describe("vehiculoPausa — historia de presencia", () => {
  it("abre una pausa y no duplica si ya está abierta", () => {
    const a = appendVehiculoPausa(undefined, 7_30, "desayuno");
    assert.equal(a.length, 1);
    assert.equal(a[0]?.titulo, "desayuno");
    const b = appendVehiculoPausa(a, 7_45, "otra");
    assert.equal(b.length, 1);
    assert.equal(b[0]?.pausadoAt, 7_30);
  });

  it("cierra la pausa abierta con reanudadoAt", () => {
    const open = appendVehiculoPausa(undefined, 1000, "desayuno");
    const closed = closeVehiculoPausaAbierta(open, 1000 + 60 * 60_000);
    assert.equal(closed?.[0]?.reanudadoAt, 1000 + 60 * 60_000);
    assert.equal(minutosPausa(closed![0]!, 1000 + 90 * 60_000), 60);
  });

  it("pausa viva usa now para la duración", () => {
    const open = { pausadoAt: 1000, titulo: "primera intercepción del dia" };
    assert.equal(minutosPausa(open, 1000 + 60 * 60_000), 60);
    assert.equal(nombrePausa(open), "primera intercepción del dia");
    assert.equal(nombrePausa({}), "Pausa");
  });

  it("un toque sin letras usa el título Pausa", () => {
    assert.equal(tituloPausaInterrupcion(), PAUSA_INTERRUPCION_TITULO);
    assert.equal(tituloPausaInterrupcion(""), PAUSA_INTERRUPCION_TITULO);
    assert.equal(tituloPausaInterrupcion("   "), PAUSA_INTERRUPCION_TITULO);
    assert.equal(tituloPausaInterrupcion(null), PAUSA_INTERRUPCION_TITULO);
    assert.equal(tituloPausaInterrupcion("llamada"), "llamada");
    assert.equal(tituloPausaInterrupcion("  costura  "), "costura");
  });

  it("nombrar corrige la pausa abierta y no abre otra", () => {
    const open = appendVehiculoPausa(undefined, 1000, "Pausa");
    const labeled = labelVehiculoPausaAbierta(open, "costura");
    assert.equal(labeled?.length, 1);
    assert.equal(labeled?.[0]?.titulo, "costura");
    assert.equal(tituloPausaAbierta({ pausas: labeled }), "costura");
    assert.equal(pausaAbiertaSinNombrar({ pausas: labeled }), false);
    assert.equal(pausaAbiertaSinNombrar({ pausas: open }), true);
  });

  it("pausa e interrupción son presencia, no misión activa", () => {
    assert.equal(isPausedPresence({ interrupcionActiva: true }), true);
    assert.equal(isPausedPresence({ desglosadorPausa: { pausadoAt: 1, subActivoId: "s1" } }), true);
    assert.equal(isPausedPresence({ vehiculoPadreDesglosadorId: "padre" }), true);
    assert.equal(isPausedPresence({ situacionNestedPause: { pausedAt: 1 } }), true);
    assert.equal(
      isPausedPresence({ subVehiculos: [{ status: "nested_paused" }] }),
      true
    );
    assert.equal(isPausedPresence({ subVehiculos: [{ status: "activo" }] }), false);
  });

  it("el padre pausado no cubre; el hijo interrupt sí", () => {
    assert.equal(isParentCoveragePaused({ interrupcionActiva: true }), true);
    assert.equal(
      isParentCoveragePaused({ desglosadorPausa: { pausadoAt: 1, subActivoId: "s1" } }),
      true
    );
    assert.equal(
      isParentCoveragePaused({ situacionNestedPause: { pausedAt: 1 } }),
      true
    );
    assert.equal(isParentCoveragePaused({ vehiculoPadreDesglosadorId: "padre" }), false);
    assert.equal(isParentCoveragePaused({}), false);
  });

  it("conquistaSessionPauseRank: pausa abierta > snapshot en curso; reanudar gana", () => {
    assert.equal(
      conquistaSessionPauseRank({
        tipoReloj: "desglosador",
        interrupcionActiva: true,
        desglosadorPausa: { subActivoId: "s1" },
        subVehiculos: [{ status: "nested_paused" }],
      }),
      1
    );
    assert.equal(
      conquistaSessionPauseRank({
        tipoReloj: "desglosador",
        subVehiculos: [{ status: "activo" }],
      }),
      0
    );
    assert.equal(
      conquistaSessionPauseRank({
        tipoReloj: "desglosador",
        pausas: [{ pausadoAt: 1, reanudadoAt: 2 }],
        subVehiculos: [{ status: "activo" }],
      }),
      2
    );
  });

  it("un resume viejo no vence a una pausa más nueva", () => {
    const paused = {
      tipoReloj: "desglosador",
      interrupcionActiva: true,
      desglosadorPausa: { subActivoId: "s1", pausadoAt: 500 },
      subVehiculos: [{ status: "nested_paused" }],
      pausas: [
        { pausadoAt: 150, reanudadoAt: 400 },
        { pausadoAt: 500 },
      ],
    };
    const staleResume = {
      tipoReloj: "desglosador",
      pausas: [{ pausadoAt: 150, reanudadoAt: 400 }],
      subVehiculos: [{ status: "activo" }],
    };
    assert.equal(conquistaPauseAction(paused).kind, "pause");
    assert.equal(conquistaPauseAction(staleResume).kind, "resume");
    assert.equal(conquistaPauseActionIsNewer(staleResume, paused), false);
    assert.equal(conquistaPauseActionIsNewer(paused, staleResume), true);
    assert.equal(pickConquistaSessionPauseSource(paused, staleResume), paused);
    assert.equal(pickConquistaSessionPauseSource(staleResume, paused), paused);
  });

  it("un reanudar explícito más nuevo sí vence a la pausa anterior", () => {
    const paused = {
      tipoReloj: "desglosador",
      interrupcionActiva: true,
      desglosadorPausa: { subActivoId: "s1", pausadoAt: 150 },
      subVehiculos: [{ status: "nested_paused" }],
      pausas: [{ pausadoAt: 150 }],
    };
    const resumed = {
      tipoReloj: "desglosador",
      pausas: [{ pausadoAt: 150, reanudadoAt: 400 }],
      subVehiculos: [{ status: "activo" }],
    };
    assert.equal(conquistaPauseActionIsNewer(resumed, paused), true);
    assert.equal(pickConquistaSessionPauseSource(resumed, paused), resumed);
    assert.equal(pickConquistaSessionPauseSource(paused, resumed), resumed);
  });
});
