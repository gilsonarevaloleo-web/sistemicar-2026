import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIGURA_CUERPO_MAX,
  FIGURA_PAQUETE,
  collectFiguraStamps,
  computeFiguraEstado,
  computeFiguraDesdeNido,
  figuraCapaDeHaces,
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

describe("figuraProyecto — red neuronal", () => {
  it("presencia no entra a la red aunque haya episodio", () => {
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

  it("toda la producción cuenta: 10 de conquista revelan el torso", () => {
    const masa = computeFiguraEstado("proyecto", stamps(0, 10));
    assert.equal(masa.conexiones, 10);
    assert.equal(masa.haces, 1);
    assert.equal(masa.miembrosRevelados, 1);
    assert.equal(masa.miembros[0]?.id, "torso");
    assert.equal(masa.capa, "cuerpo");
    assert.match(masa.copyHueco, /cabeza/);
  });

  it("Costura: 21 ejecución + 8 enfoque cablean dos ganglios, no se quedan hinchados", () => {
    const costura = computeFiguraEstado("proyecto", stamps(8, 21));
    assert.equal(costura.conexiones, 29);
    assert.equal(costura.haces, 2);
    assert.equal(costura.miembrosRevelados, 2);
    assert.equal(costura.miembros[0]?.revelado, true);
    assert.equal(costura.miembros[1]?.revelado, true);
    assert.equal(costura.hueco.enPaquete, 9);
    assert.equal(costura.hueco.siguiente?.id, "brazoI");
    assert.match(costura.copyHueco, /9 de 10 para revelar el brazo izquierdo/);
    assert.equal(figuraProgresoLabel(costura), "29 conexiones · 2 haces");
  });

  it("9 conexiones no revelan ganglio; 10 sí", () => {
    const nine = computeFiguraEstado("proyecto", stamps(9, 0));
    assert.equal(nine.miembrosRevelados, 0);
    assert.equal(nine.hueco.enPaquete, 9);
    assert.equal(nine.hueco.siguiente?.id, "torso");

    const ten = computeFiguraEstado("proyecto", stamps(10, 0));
    assert.equal(ten.miembrosRevelados, 1);
    assert.equal(ten.deformacion, "ramas");
  });

  it("10 forma + 10 masa: torso revelado, equilibrado", () => {
    const ok = computeFiguraEstado("proyecto", stamps(10, 10));
    assert.equal(ok.miembrosRevelados, 2);
    assert.equal(ok.deformacion, "ninguna");
    assert.equal(ok.hueco.siguiente?.id, "brazoI");
  });

  it("60 conexiones cablean el cuerpo y pasan a malla", () => {
    const full = computeFiguraEstado(
      "proyecto",
      stamps(0, FIGURA_CUERPO_MAX * FIGURA_PAQUETE)
    );
    assert.equal(full.miembrosRevelados, FIGURA_CUERPO_MAX);
    assert.equal(full.cuerpoCableado, true);
    assert.equal(full.capa, "red");
    assert.equal(full.casaRevelada, false);
    assert.match(full.copy, /mieliniza|malla|ganglios/i);
  });

  it("120 conexiones revelan la casa; 180 abren linaje", () => {
    const casa = computeFiguraEstado("proyecto", stamps(0, 120));
    assert.equal(figuraCapaDeHaces(casa.haces), "casa");
    assert.equal(casa.casaRevelada, true);
    assert.match(casa.copy, /casa/i);

    const linaje = computeFiguraEstado("proyecto", stamps(20, 160));
    assert.equal(linaje.capa, "linaje");
    assert.ok(linaje.linajeRevelados >= 0);
    assert.match(linaje.copy, /otros|casa/i);
  });

  it("control revela anillos con producción total", () => {
    const c = computeFiguraEstado("centro", stamps(0, 10));
    assert.equal(c.modo, "control");
    assert.equal(c.miembros[0]?.id, "s1");
    assert.equal(c.miembrosRevelados, 1);
    assert.match(c.copyHueco, /segundo anillo/);
  });

  it("consciencia no revela miembros: brillo de registro", () => {
    const v = computeFiguraEstado("consciencia", stamps(12, 3));
    assert.equal(v.modo, "consciencia");
    assert.equal(v.miembrosRevelados, 0);
    assert.equal(v.miembros.length, 0);
    assert.equal(v.enviosRegistro, 15);
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
        vehiculos: Array.from({ length: 21 }, (_, i) => ({
          vehicleId: `t${i}`,
          tipoOrigen: "tiempo" as const,
        })),
      },
      presenciaEpisodio: {
        vehiculos: Array.from({ length: 40 }, (_, i) => ({
          vehicleId: `p${i}`,
          tipoOrigen: "tiempo" as const,
        })),
      },
    });
    assert.equal(estado.conexiones, 21);
    assert.equal(estado.miembrosRevelados, 2);
    assert.equal(estado.enviosMasa, 21);
  });

  it("etiqueta desconocida se lee como crecimiento", () => {
    const e = computeFiguraEstado("otra", stamps(0, 0));
    assert.equal(e.modo, "crecimiento");
    assert.equal(figuraProgresoLabel(e), "0 conexiones · 0 haces");
  });
});
