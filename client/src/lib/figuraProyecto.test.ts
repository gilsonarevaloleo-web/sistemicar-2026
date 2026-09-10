import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIGURA_MIEMBROS_MAX,
  FIGURA_PAQUETE,
  collectFiguraStamps,
  computeFiguraEstado,
  computeFiguraDesdeNido,
  figuraProgresoLabel,
  type FiguraStamp,
} from "./figuraProyecto.ts";

function stamps(nForma: number, nMasa: number, prefix = "v"): FiguraStamp[] {
  const out: FiguraStamp[] = [];
  for (let i = 0; i < nForma; i++) {
    out.push({ vehicleId: `${prefix}-f${i}`, tipoOrigen: "situacion" });
  }
  for (let i = 0; i < nMasa; i++) {
    out.push({ vehicleId: `${prefix}-m${i}`, tipoOrigen: "tiempo" });
  }
  return out;
}

describe("figuraProyecto — cristalización", () => {
  it("presencia no entra a la figura aunque haya episodio", () => {
    const collected = collectFiguraStamps({
      presenciaEpisodio: {
        vehiculos: [
          { vehicleId: "pres-1", tipoOrigen: "tiempo" },
          { vehicleId: "pres-2", tipoOrigen: "situacion" },
        ],
      },
      liveTimon: {
        vehiculos: [{ vehicleId: "dir-1", tipoOrigen: "situacion" }],
      },
    });
    assert.deepEqual(
      collected.map(s => s.vehicleId),
      ["dir-1"]
    );
  });

  it("gasto de presencia no cuenta; dirección sí, sin duplicar el timón", () => {
    const collected = collectFiguraStamps({
      liveTimon: {
        vehiculos: [{ vehicleId: "same", tipoOrigen: "tiempo" }],
      },
      gasto: {
        sellos: [
          { vid: "same", dest: "direccion" },
          { vid: "solo-gasto", dest: "direccion" },
          { vid: "dia", dest: "presencia" },
        ],
      },
    });
    assert.equal(collected.length, 2);
    assert.equal(collected.find(s => s.vehicleId === "same")?.tipoOrigen, "tiempo");
    assert.ok(collected.some(s => s.vehicleId === "solo-gasto"));
  });

  it("9 envíos de enfoque no revelan miembro; 10 revelan el torso", () => {
    const nine = computeFiguraEstado("proyecto", stamps(9, 0));
    assert.equal(nine.miembrosRevelados, 0);
    assert.equal(nine.hueco.enPaquete, 9);
    assert.equal(nine.hueco.siguiente?.id, "torso");
    assert.match(nine.copyHueco, /9 de 10 para revelar el torso/);

    const ten = computeFiguraEstado("proyecto", stamps(10, 0));
    assert.equal(ten.miembrosRevelados, 1);
    assert.equal(ten.miembros[0]?.revelado, true);
    assert.equal(ten.miembros[1]?.esSiguiente, true);
    assert.equal(ten.deformacion, "hueca");
  });

  it("10 de conquista sin forma: masa hinchada, cero miembros", () => {
    const masa = computeFiguraEstado("proyecto", stamps(0, 10));
    assert.equal(masa.miembrosRevelados, 0);
    assert.equal(masa.paquetesMasa, 1);
    assert.equal(masa.deformacion, "hinchada");
    assert.equal(masa.masaFill, 0);
    assert.match(masa.copy, /peso sin contorno/i);
    assert.equal(masa.hueco.tejido, "forma");
  });

  it("10 forma + 10 masa: torso revelado y lleno, equilibrado", () => {
    const ok = computeFiguraEstado("proyecto", stamps(10, 10));
    assert.equal(ok.miembrosRevelados, 1);
    assert.equal(ok.deformacion, "ninguna");
    assert.equal(ok.masaFill, 1);
    assert.equal(ok.hueco.siguiente?.id, "cabeza");
    assert.match(ok.copyHueco, /0 de 10 para revelar la cabeza/);
  });

  it("60 de forma revelan la figura completa", () => {
    const full = computeFiguraEstado(
      "proyecto",
      stamps(FIGURA_MIEMBROS_MAX * FIGURA_PAQUETE, FIGURA_MIEMBROS_MAX * FIGURA_PAQUETE)
    );
    assert.equal(full.miembrosRevelados, FIGURA_MIEMBROS_MAX);
    assert.equal(full.figuraCompleta, true);
    assert.equal(full.deformacion, "ninguna");
    assert.match(full.copy, /ya se ve/);
  });

  it("figura completa hueca pide masa, no otro miembro", () => {
    const hueca = computeFiguraEstado(
      "proyecto",
      stamps(FIGURA_MIEMBROS_MAX * FIGURA_PAQUETE, 0)
    );
    assert.equal(hueca.figuraCompleta, true);
    assert.equal(hueca.deformacion, "hueca");
    assert.equal(hueca.hueco.tejido, "masa");
    assert.equal(hueca.hueco.siguiente, null);
  });

  it("control revela anillos, no miembros de cuerpo", () => {
    const c = computeFiguraEstado("centro", stamps(10, 0));
    assert.equal(c.modo, "control");
    assert.equal(c.miembros[0]?.id, "s1");
    assert.equal(c.miembros[0]?.label, "el cimiento");
    assert.match(c.copyHueco, /segundo anillo/);
  });

  it("consciencia no revela miembros: brillo de registro", () => {
    const v = computeFiguraEstado("consciencia", stamps(12, 3));
    assert.equal(v.modo, "consciencia");
    assert.equal(v.miembrosRevelados, 0);
    assert.equal(v.miembros.length, 0);
    assert.equal(v.enviosRegistro, 15);
    assert.equal(v.deformacion, "ninguna");
    assert.equal(v.hueco.tejido, "registro");
    assert.match(v.copy, /no trepa|Información/i);
  });

  it("vehicleId duplicado cuenta una sola vez", () => {
    const collected = collectFiguraStamps({
      peldanos: [
        {
          timonEpisodio: {
            vehiculos: [{ vehicleId: "dup", tipoOrigen: "situacion" }],
          },
          timonCerrados: [
            { vehiculos: [{ vehicleId: "dup", tipoOrigen: "tiempo" }] },
          ],
          resumen: {
            timon: { vehiculos: [{ vehicleId: "dup", tipoOrigen: "situacion" }] },
          },
        },
      ],
    });
    assert.equal(collected.length, 1);
    assert.equal(collected[0]?.tipoOrigen, "situacion");
  });

  it("liveTimon gana al peldaño si el id ya estaba", () => {
    const collected = collectFiguraStamps({
      liveTimon: {
        vehiculos: [{ vehicleId: "a", tipoOrigen: "tiempo" }],
      },
      peldanos: [
        {
          timonEpisodio: {
            vehiculos: [{ vehicleId: "a", tipoOrigen: "situacion" }],
          },
        },
      ],
    });
    assert.equal(collected[0]?.tipoOrigen, "tiempo");
  });

  it("computeFiguraDesdeNido ignora presencia y lee el timón vivo", () => {
    const estado = computeFiguraDesdeNido({
      etiqueta: "proyecto",
      liveTimon: {
        vehiculos: Array.from({ length: 10 }, (_, i) => ({
          vehicleId: `s${i}`,
          tipoOrigen: "situacion" as const,
        })),
      },
      presenciaEpisodio: {
        vehiculos: Array.from({ length: 40 }, (_, i) => ({
          vehicleId: `p${i}`,
          tipoOrigen: "tiempo" as const,
        })),
      },
    });
    assert.equal(estado.miembrosRevelados, 1);
    assert.equal(estado.enviosMasa, 0);
  });

  it("etiqueta desconocida se lee como crecimiento", () => {
    const e = computeFiguraEstado("otra", stamps(0, 0));
    assert.equal(e.modo, "crecimiento");
    assert.equal(figuraProgresoLabel(e), "forma 0 · masa 0");
  });
});
