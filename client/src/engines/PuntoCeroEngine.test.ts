import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coloresEnProgreso,
  confirmColor,
  faseDuracionesMin,
  initPuntoCeroSession,
  shouldEnterPasiva,
  shouldComplete,
  tickPuntoCero,
  todosColoresConfirmados,
  getPuntoCeroPasoActual,
} from "./PuntoCeroEngine.ts";
import { etapasPuntoCeroVacias } from "../lib/puntoCeroTypes.ts";

describe("PuntoCeroEngine", () => {
  it("faseDuracionesMin reparte 1/3 activa y 2/3 pasiva", () => {
    const d15 = faseDuracionesMin(15);
    assert.equal(d15.activaMin + d15.pasivaMin, 15);
    assert.equal(d15.activaMin, 5);

    const d20 = faseDuracionesMin(20);
    assert.equal(d20.activaMin + d20.pasivaMin, 20);
  });

  it("shouldEnterPasiva al completar 7 colores antes del min activo", () => {
    const base = 1_700_000_000_000;
    let s = initPuntoCeroSession("dia", 15, base);
    for (let i = 0; i < 7; i++) s = confirmColor(s, i);
    assert.equal(shouldEnterPasiva(s, base + 2 * 60000, s.coloresConfirmados), true);
  });

  it("shouldEnterPasiva solo al completar 7 colores", () => {
    const base = 1_700_000_000_000;
    const s = initPuntoCeroSession("dia", 15, base);
    assert.equal(shouldEnterPasiva(s, base + 5 * 60000, s.coloresConfirmados), false);
  });

  it("no entra a pasiva por tiempo si faltan colores del arcoíris", () => {
    const base = 1_700_000_000_000;
    let s = initPuntoCeroSession("dia", 15, base);
    s = confirmColor(s, 0);
    assert.equal(coloresEnProgreso(s.coloresConfirmados), true);
    assert.equal(shouldEnterPasiva(s, base + 10 * 60000, s.coloresConfirmados), false);
  });

  it("tickPuntoCero transiciona a pasiva y luego completada", () => {
    const base = 1_700_000_000_000;
    let s = initPuntoCeroSession("noche", 15, base);
    for (let i = 0; i < 7; i++) s = confirmColor(s, i);
    const t1 = tickPuntoCero(s, base + 60_000);
    assert.equal(t1.session.fase, "pasiva");
    assert.ok(t1.events.some(e => e.type === "enter_pasiva"));

    const t2 = tickPuntoCero(t1.session, base + 15 * 60000);
    assert.equal(t2.session.fase, "completada");
    assert.ok(t2.events.some(e => e.type === "enter_completada"));
    assert.equal(t2.events.some(e => e.type === "auto_close_due"), false);
  });

  it("shouldComplete al llegar duracionTotalMin", () => {
    const base = 1_700_000_000_000;
    const s = initPuntoCeroSession("dia", 20, base);
    assert.equal(shouldComplete(s, base + 19 * 60000), false);
    assert.equal(shouldComplete(s, base + 20 * 60000), true);
  });

  it("todosColoresConfirmados requiere los 7", () => {
    const cols = [true, true, true, true, true, true, false];
    assert.equal(todosColoresConfirmados(cols), false);
    assert.equal(todosColoresConfirmados([...cols.slice(0, 6), true]), true);
  });

  it("getPuntoCeroPasoActual expone paso 5 tras colores", () => {
    const ep = { ...etapasPuntoCeroVacias(), etapa1: true, etapa2: true, etapa3: true };
    const cols = Array(7).fill(true);
    const paso = getPuntoCeroPasoActual(ep, cols, "activa", "noche");
    assert.equal(paso.paso, 5);
    assert.match(paso.titulo, /Apagón|sueño/i);
  });
});
