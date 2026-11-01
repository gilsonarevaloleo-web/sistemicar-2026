import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  absorberDiasConVolcado,
  calendarioAsistencia,
  debeMostrarVentana,
  estadoDia,
  inicioSemanaLunes,
  limaDateKey,
  limaHoraLabel,
  libroVacio,
  marcaConciencia,
  marcarSesionCumplida,
  MENSAJE_SESION_CUMPLIDA,
  normalizarLibro,
  preguntaConciencia,
  registrarIntencion,
  resumenAsistencia,
  sumarDias,
  weekdayDeFecha,
} from "./asistencia.ts";

/** Domingo 1 nov 2026 10:32 Lima = 15:32 UTC. */
const DOMINGO_LIMA = Date.UTC(2026, 10, 1, 15, 32, 0);

describe("Depósito — asistencia consciente", () => {
  it("nombra fecha, día y hora en Lima", () => {
    const marca = marcaConciencia(DOMINGO_LIMA);
    assert.equal(marca.fecha, "2026-11-01");
    assert.equal(marca.dia, "domingo");
    assert.equal(marca.hora, "10:32");
    assert.equal(marca.fechaHumana, "1 de noviembre de 2026");
    assert.equal(limaDateKey(DOMINGO_LIMA), "2026-11-01");
    assert.equal(limaHoraLabel(DOMINGO_LIMA), "10:32");
    const pregunta = preguntaConciencia(DOMINGO_LIMA);
    assert.match(pregunta.pregunta, /sesión de Depósito hoy/);
    assert.match(pregunta.marca, /domingo · 1 de noviembre de 2026 · 10:32/);
    assert.match(MENSAJE_SESION_CUMPLIDA, /Sesión Sistemicar cumplida/);
  });

  it("cruza medianoche Lima, no UTC", () => {
    const casiMedianoche = Date.UTC(2026, 10, 2, 4, 59, 0);
    const yaLunes = Date.UTC(2026, 10, 2, 5, 0, 0);
    assert.equal(limaDateKey(casiMedianoche), "2026-11-01");
    assert.equal(limaDateKey(yaLunes), "2026-11-02");
  });

  it("la ventana sale una vez al día: sin registro, no si ya eligió o ya cumplió", () => {
    assert.equal(debeMostrarVentana(undefined), true);
    assert.equal(debeMostrarVentana(null), true);
    const libro = registrarIntencion(libroVacio(), "2026-11-01", "si", "10:32");
    assert.equal(debeMostrarVentana(libro.registros["2026-11-01"]), false);
    const no = registrarIntencion(libroVacio(), "2026-11-01", "no", "10:32");
    assert.equal(debeMostrarVentana(no.registros["2026-11-01"]), false);
    const cumplida = marcarSesionCumplida(libroVacio(), "2026-11-01", "11:00");
    assert.equal(debeMostrarVentana(cumplida.registros["2026-11-01"]), false);
  });

  it("Sí o No entran igual: la intención no sella la sesión", () => {
    const no = registrarIntencion(libroVacio(), "2026-11-01", "no", "10:32");
    assert.equal(no.registros["2026-11-01"].intencion, "no");
    assert.equal(no.registros["2026-11-01"].sesionCumplida, false);
    const luego = marcarSesionCumplida(no, "2026-11-01", "18:00");
    assert.equal(luego.registros["2026-11-01"].intencion, "no");
    assert.equal(luego.registros["2026-11-01"].sesionCumplida, true);
    assert.equal(luego.registros["2026-11-01"].horaCumplida, "18:00");
  });

  it("no reescribe la primera elección del día", () => {
    const si = registrarIntencion(libroVacio(), "2026-11-01", "si", "08:00");
    const otra = registrarIntencion(si, "2026-11-01", "no", "20:00");
    assert.equal(otra.registros["2026-11-01"].intencion, "si");
    assert.equal(otra.registros["2026-11-01"].horaIntencion, "08:00");
  });

  it("absorbe volcados históricos como días cumplidos", () => {
    const libro = absorberDiasConVolcado(libroVacio(), [
      DOMINGO_LIMA,
      Date.UTC(2026, 9, 28, 16, 0, 0),
    ]);
    assert.equal(libro.registros["2026-11-01"].sesionCumplida, true);
    assert.equal(libro.registros["2026-10-28"].sesionCumplida, true);
    const otra = absorberDiasConVolcado(libro, [DOMINGO_LIMA]);
    assert.equal(otra, libro);
  });

  it("calendario de 4 semanas: cumplida / dijo sí / dijo no / ausente", () => {
    let libro = registrarIntencion(libroVacio(), "2026-10-28", "si", "09:00");
    libro = marcarSesionCumplida(libro, "2026-10-28", "09:40");
    libro = registrarIntencion(libro, "2026-10-30", "si", "08:00");
    libro = registrarIntencion(libro, "2026-10-31", "no", "21:00");
    const celdas = calendarioAsistencia(libro, "2026-11-01", 4);
    assert.equal(celdas.length, 28);
    assert.equal(celdas[0].fecha, "2026-10-05");
    assert.equal(celdas[0].dia, "lunes");
    assert.equal(inicioSemanaLunes("2026-11-01"), "2026-10-26");
    assert.equal(weekdayDeFecha("2026-11-01"), 0);
    const ok = celdas.find((c) => c.fecha === "2026-10-28");
    const pendiente = celdas.find((c) => c.fecha === "2026-10-30");
    const no = celdas.find((c) => c.fecha === "2026-10-31");
    const hoy = celdas.find((c) => c.fecha === "2026-11-01");
    assert.equal(ok?.estado, "cumplida");
    assert.equal(pendiente?.estado, "dijo_si");
    assert.equal(no?.estado, "dijo_no");
    assert.equal(hoy?.estado, "hoy");
    assert.equal(hoy?.esHoy, true);
    const midweek = calendarioAsistencia(libroVacio(), "2026-10-28", 1);
    assert.equal(midweek.find((c) => c.fecha === "2026-10-29")?.estado, "futuro");
    assert.equal(estadoDia(undefined, { esHoy: false, esFuturo: false }), "ausente");
    const resumen = resumenAsistencia(celdas);
    assert.equal(resumen.diasConSesion, 1);
    assert.equal(resumen.nombradosSinSesion, 2);
    assert.ok(resumen.diasSinSesion > 0);
    assert.equal(resumen.rachaActual, 0);
  });

  it("la racha cuenta días cumplidos hacia atrás y salta el hoy vacío", () => {
    let libro = marcarSesionCumplida(libroVacio(), "2026-10-30");
    libro = marcarSesionCumplida(libro, "2026-10-31");
    const celdas = calendarioAsistencia(libro, "2026-11-01", 1);
    assert.equal(resumenAsistencia(celdas).rachaActual, 2);
    libro = marcarSesionCumplida(libro, "2026-11-01");
    const conHoy = calendarioAsistencia(libro, "2026-11-01", 1);
    assert.equal(resumenAsistencia(conHoy).rachaActual, 3);
  });

  it("normaliza basura y rechaza fechas rotas", () => {
    const libro = normalizarLibro({
      registros: {
        "2026-11-01": { sesionCumplida: 1, intencion: "si", horaIntencion: "10:00" },
        mala: { sesionCumplida: true },
        "2026-11-02": { intencion: "quizas" },
      },
    });
    assert.equal(libro.registros["2026-11-01"].sesionCumplida, true);
    assert.equal(libro.registros["2026-11-01"].intencion, "si");
    assert.equal(libro.registros.mala, undefined);
    assert.equal(libro.registros["2026-11-02"].intencion, undefined);
    assert.deepEqual(registrarIntencion(libroVacio(), "hoy", "si"), libroVacio());
    assert.equal(sumarDias("2026-10-31", 1), "2026-11-01");
  });
});
