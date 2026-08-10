import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CRISOL_DIRECCION_HINT,
  CRISOL_MOS_LABEL,
  CRISOL_TAGLINE,
  CRISOL_TITLE,
  IMAN_PENSAMIENTOS_TITLE,
  NIDO_INBOX_ID,
  agruparImanPorNido,
  dominanteProyectoIdEnSubs,
  imanItemsParaDesglosador,
  reservaEsEnviabeASituacion,
  nidoKeyFromReserva,
  resolveProyectoIdEnfoqueSituacion,
  subTareaConPasoEjecutado,
  subTareaFromImanItem,
} from "./imanPensamientos";
import type { SituacionReservaItem } from "./situacionReserva";

function reserva(partial: Partial<SituacionReservaItem> & Pick<SituacionReservaItem, "id" | "texto">): SituacionReservaItem {
  return {
    userId: "u1",
    reservadaAt: Date.now(),
    estado: "activa",
    ...partial,
  };
}

describe("imanPensamientos", () => {
  it("CRISOL_* branding y alias IMAN_* deprecado", () => {
    assert.equal(CRISOL_TITLE, "El Crisol");
    assert.ok(CRISOL_TAGLINE.includes("Ordena pensamientos"));
    assert.equal(CRISOL_MOS_LABEL, "Matriz de Ordenamiento Situacional");
    assert.ok(CRISOL_DIRECCION_HINT.includes("dirección"));
    assert.equal(IMAN_PENSAMIENTOS_TITLE, CRISOL_TITLE);
  });

  it("nidoKeyFromReserva usa inbox sin proyecto", () => {
    assert.equal(nidoKeyFromReserva(reserva({ id: "1", texto: "x" })), NIDO_INBOX_ID);
    assert.equal(nidoKeyFromReserva(reserva({ id: "2", texto: "y", proyectoId: "proy_a" })), "proy_a");
  });

  it("agruparImanPorNido ordena por proyectos conocidos e inbox al final", () => {
    const items = [
      reserva({ id: "a", texto: "sin nido", reservadaAt: 3 }),
      reserva({ id: "b", texto: "proy b", proyectoId: "p_b", reservadaAt: 2 }),
      reserva({ id: "c", texto: "proy a", proyectoId: "p_a", reservadaAt: 1 }),
    ];
    const grupos = agruparImanPorNido(items, [
      { id: "p_a", titulo: "Alpha", etiqueta: "proyecto" },
      { id: "p_b", titulo: "Beta", etiqueta: "centro" },
    ]);
    assert.deepEqual(grupos.map(g => g.nidoId), ["p_b", "p_a", NIDO_INBOX_ID]);
    assert.equal(grupos[0].items.length, 1);
    assert.ok(grupos[2].titulo.includes("Aterrizaje"));
  });

  it("reservaEsEnviabeASituacion excluye consideracion", () => {
    assert.equal(reservaEsEnviabeASituacion(reserva({ id: "1", texto: "e", ruta: "ejecucion" })), true);
    assert.equal(
      reservaEsEnviabeASituacion(reserva({ id: "2", texto: "m", ruta: "consideracion" })),
      false
    );
  });

  it("imanItemsParaDesglosador excluye consideracion", () => {
    const items = [
      reserva({ id: "1", texto: "s", ruta: "situacion_desglosador" }),
      reserva({ id: "2", texto: "e", ruta: "ejecucion" }),
      reserva({ id: "3", texto: "m", ruta: "consideracion" }),
    ];
    assert.deepEqual(imanItemsParaDesglosador(items).map(i => i.id), ["1", "2"]);
  });

  it("subTareaFromImanItem conserva vínculo al proyecto y reserva", () => {
    const item = reserva({
      id: "res_1",
      texto: "Llamar proveedor",
      proyectoId: "proy_x",
      rutaSeguimientoPaso: 2,
      minutosCupo: 5,
    });
    const sub = subTareaFromImanItem(item, "batch_0");
    assert.equal(sub.texto, "Llamar proveedor");
    assert.equal(sub.proyectoId, "proy_x");
    assert.equal(sub.origenImanId, "res_1");
    assert.equal(sub.rutaSeguimientoPaso, 2);
    assert.equal(sub.minutosCupo, 5);
  });

  it("subTareaConPasoEjecutado marca solo la fila cumplida", () => {
    const subs = [
      { id: "a", texto: "1", completada: false, creadaAt: 1 },
      { id: "b", texto: "2", completada: true, creadaAt: 2 },
    ];
    const next = subTareaConPasoEjecutado(subs, "b", 7);
    assert.equal(next[0].pasoEjecutadoNumero, undefined);
    assert.equal(next[1].pasoEjecutadoNumero, 7);
  });

  it("resolveProyectoIdEnfoqueSituacion usa cascada nido bloque → cron → vehículo", () => {
    const vehicle = {
      proyectoId: "veh_proy",
      subTareas: [
        { id: "a", texto: "A", completada: false, creadaAt: 1, enDesgloseCronometro: true, proyectoId: "p_cron" },
        { id: "b", texto: "B", completada: false, creadaAt: 2, enDesgloseCronometro: true, proyectoId: "p_cron" },
      ],
      situacionCronometro: { activo: true, proyectoEnfoqueId: "p_bloque" },
    };
    assert.equal(resolveProyectoIdEnfoqueSituacion(vehicle), "p_bloque");
    assert.equal(dominanteProyectoIdEnSubs(vehicle.subTareas!), "p_cron");
    const sinBloque = { ...vehicle, situacionCronometro: { activo: true } };
    assert.equal(resolveProyectoIdEnfoqueSituacion(sinBloque), "p_cron");
  });
});
