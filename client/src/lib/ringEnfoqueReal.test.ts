import { describe, expect, it } from "vitest";
import type { SubTarea } from "./persistence";
import {
  buildSituacionCronometroPausaInactividad,
  clearRingActivity,
  filtrarRingPendientes,
  getRingLastActivity,
  liberarRingPendientesAlTaller,
  quitarSubsPorId,
  ringBienvenidaParts,
  ringSessionOperable,
  ringTiempoSobraParts,
  touchRingActivity,
} from "./ringEnfoqueReal";

describe("ringEnfoqueReal", () => {
  it("ringBienvenidaParts incluye ritual en primera ronda", () => {
    const parts = ringBienvenidaParts(1);
    expect(parts[0]).toContain("entrenamiento de enfoque real");
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  it("ringTiempoSobraParts menciona minutos sobrantes", () => {
    const parts = ringTiempoSobraParts(25);
    expect(parts.join(" ")).toContain("25 minutos");
  });

  it("filtrarRingPendientes solo incluye filas selladas pendientes", () => {
    const subs: SubTarea[] = [
      {
        id: "a",
        texto: "Pendiente ring",
        enDesgloseCronometro: true,
        resultadoSituacion: "pendiente",
        completada: false,
        creadaAt: 1,
      },
      {
        id: "b",
        texto: "Cumplida",
        enDesgloseCronometro: true,
        resultadoSituacion: "cumplido",
        completada: false,
        creadaAt: 1,
      },
      {
        id: "c",
        texto: "Taller",
        enDesgloseCronometro: false,
        completada: false,
        creadaAt: 1,
      },
    ];
    expect(filtrarRingPendientes(subs).map(s => s.id)).toEqual(["a"]);
    expect(quitarSubsPorId(subs, new Set(["a"])).map(s => s.id)).toEqual(["b", "c"]);
  });

  it("liberarRingPendientesAlTaller devuelve pendientes al Taller sin fallarlas", () => {
    const subs: SubTarea[] = [
      {
        id: "a",
        texto: "Pendiente",
        enDesgloseCronometro: true,
        resultadoSituacion: "pendiente",
        minutosCupo: 5,
        completada: false,
      },
      {
        id: "b",
        texto: "Cumplida",
        enDesgloseCronometro: true,
        resultadoSituacion: "cumplido",
        completada: false,
      },
    ];
    const out = liberarRingPendientesAlTaller(subs);
    expect(out[0].enDesgloseCronometro).toBe(false);
    expect(out[0].resultadoSituacion).toBeUndefined();
    expect(out[0].minutosCupo).toBeUndefined();
    expect(out[1].enDesgloseCronometro).toBe(true);
    expect(out[1].resultadoSituacion).toBe("cumplido");
  });

  it("touchRingActivity registra actividad por vehículo", () => {
    clearRingActivity("v1");
    touchRingActivity("v1", 5000);
    expect(getRingLastActivity("v1", 0)).toBe(5000);
    clearRingActivity("v1");
    expect(getRingLastActivity("v1", 999)).toBe(999);
  });

  it("buildSituacionCronometroPausaInactividad no incrementa retos completados", () => {
    const sc = {
      activo: true as const,
      bloqueInicioAt: 1000,
      retosCompletados: 2,
      retoNumero: 3,
      horaFinMs: 999999,
      horaFinContratoMs: 999999,
    };
    const pausa = buildSituacionCronometroPausaInactividad(sc);
    expect(pausa.activo).toBe(false);
    expect(pausa.retosCompletados).toBe(2);
  });

  it("ringSessionOperable true con ring activo o pausado con pendientes", () => {
    const subs: SubTarea[] = [
      {
        id: "a",
        texto: "Pendiente",
        enDesgloseCronometro: true,
        resultadoSituacion: "pendiente",
        completada: false,
        creadaAt: 1,
      },
    ];
    expect(ringSessionOperable({ activo: true, bloqueInicioAt: 1 }, subs)).toBe(true);
    expect(ringSessionOperable({ activo: false, bloqueInicioAt: 1 }, subs)).toBe(true);
    expect(ringSessionOperable({ activo: false, bloqueInicioAt: 1 }, [])).toBe(false);
    expect(ringSessionOperable(null, subs)).toBe(false);
  });
});
