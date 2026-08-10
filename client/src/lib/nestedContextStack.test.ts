import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Vehicle } from "./persistence.ts";
import {
  buildSituacionNestedPausePatch,
  resumeSituacionFromNestedPause,
} from "./nestedContextStack.ts";

function baseRing(now: number): Vehicle {
  return {
    id: "v1",
    userId: "u1",
    titulo: "Enfoque",
    status: "activo",
    tipoFlota: "situacion",
    subTareas: [
      {
        id: "st1",
        texto: "A",
        completada: false,
        creadaAt: now,
        enDesgloseCronometro: true,
        resultadoSituacion: "pendiente",
        minutosCupo: 25,
      },
    ],
    situacionCronometro: {
      activo: true,
      bloqueInicioAt: now,
      horaFinMs: now + 25 * 60_000,
      horaFinContratoMs: now + 25 * 60_000,
      retoNumero: 1,
      retosCompletados: 0,
      minutosGanadosReto: 0,
      minutosGanadosSesion: 0,
      saldoAdelantoMin: 0,
      depthBlockPsGranted: 0,
      proyectoEnfoqueId: "proy-1",
    },
    situacionCupoAnchor: { subTareaId: "st1", startedAt: now },
  } as Vehicle;
}

describe("situacion nested pause / postergación", () => {
  it("postergar congela el ring y guarda minutos restantes", () => {
    const now = 1_000_000;
    const vehicle = baseRing(now);
    const patch = buildSituacionNestedPausePatch(vehicle, "postergacion", {
      nowMs: now,
      minutosRestantes: 25,
    });
    assert.ok(patch);
    assert.equal(patch!.situacionCronometro?.activo, false);
    assert.equal(patch!.situacionNestedPause?.kind, "postergacion");
    assert.equal(patch!.situacionNestedPause?.minutosRestantesAlPausar, 25);
    assert.equal(patch!.situacionNestedPause?.situacionCronometro.activo, true);
  });

  it("reanudar desplaza la meta y conserva el cupo de pared", () => {
    const t0 = 1_000_000;
    const pauseAt = t0 + 5 * 60_000;
    const resumeAt = pauseAt + 12 * 60_000; // 12 min postergado
    const paused = {
      ...baseRing(t0),
      ...buildSituacionNestedPausePatch(baseRing(t0), "postergacion", {
        nowMs: pauseAt,
        minutosRestantes: 20,
      }),
    } as Vehicle;

    const resume = resumeSituacionFromNestedPause(paused, { nowMs: resumeAt });
    assert.ok(resume);
    assert.equal(resume!.situacionNestedPause, null);
    assert.equal(resume!.situacionCronometro?.activo, true);

    const pauseMs = 12 * 60_000;
    assert.equal(
      resume!.situacionCronometro?.horaFinContratoMs,
      t0 + 25 * 60_000 + pauseMs
    );
    assert.equal(
      resume!.situacionCronometro?.bloqueInicioAt,
      t0 + pauseMs
    );
    // Cupo de pared restante al reanudar ≈ 20 min (meta - now)
    const wallMin = Math.round(
      ((resume!.situacionCronometro!.horaFinContratoMs! - resumeAt) / 60_000)
    );
    assert.equal(wallMin, 20);
  });

  it("no vuelve a postergar si ya está postergado", () => {
    const now = 1_000_000;
    const vehicle = {
      ...baseRing(now),
      ...buildSituacionNestedPausePatch(baseRing(now), "postergacion", {
        nowMs: now,
        minutosRestantes: 10,
      }),
    } as Vehicle;
    assert.equal(buildSituacionNestedPausePatch(vehicle, "postergacion"), null);
  });
});
