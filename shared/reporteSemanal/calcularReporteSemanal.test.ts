import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calcularReporteSemanal,
  isCierreConscienteAlTermino,
  isInvisibleCentinela,
} from "./calcularReporteSemanal.ts";
import { TEXTO_INSUFICIENTE, type CalcularReporteSemanalInput, type SegmentoSemanal, type VehiculoSemanal } from "./types.ts";
import { monday0500LimaMs, resolveVentanaSemanal } from "./ventana.ts";

/** Lunes 2026-08-31 05:00 Lima → semana 2026-W36. */
const LUNES_W36 = "2026-08-31";
const SELLO_W36_MS = monday0500LimaMs("2026-09-07");

function fechaW36(offset: number): string {
  const [y, m, d] = LUNES_W36.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + offset, 12, 0, 0);
  const dt = new Date(utc);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function limaMs(ymd: string, hh: number, mm = 0): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d, hh + 5, mm, 0);
}

function seg(opts: Partial<SegmentoSemanal> & { horaInicio: string; horaFin: string }): SegmentoSemanal {
  return { ...opts };
}

function planilla(
  offset: number,
  segmentos: SegmentoSemanal[],
): NonNullable<CalcularReporteSemanalInput["planillas"]>[number] {
  return { fecha: fechaW36(offset), segmentos };
}

function veh(partial: Partial<VehiculoSemanal> & { id: string; cierreAt: number }): VehiculoSemanal {
  return {
    cierreManual: true,
    status: "cumplido",
    ...partial,
  };
}

function baseInput(
  extra: Partial<CalcularReporteSemanalInput> = {},
): CalcularReporteSemanalInput {
  return {
    nowMs: SELLO_W36_MS,
    objetivo: "cerrada",
    ...extra,
  };
}

describe("ventana lunes 05:00 Lima", () => {
  it("W36: 2026-08-31 → 2026-09-06, sello el lunes 05:00", () => {
    const v = resolveVentanaSemanal(SELLO_W36_MS, "cerrada");
    assert.equal(v.semanaId, "2026-W36");
    assert.equal(v.inicioJournal, "2026-08-31");
    assert.equal(v.finJournal, "2026-09-06");
    assert.equal(v.startMs, monday0500LimaMs(LUNES_W36));
    assert.equal(v.endMs, SELLO_W36_MS);
  });

  it("lunes 04:59 Lima sigue en la semana anterior (journal domingo)", () => {
    const justBefore = SELLO_W36_MS - 60_000;
    const actual = resolveVentanaSemanal(justBefore, "actual");
    assert.equal(actual.semanaId, "2026-W36");
    const cerrada = resolveVentanaSemanal(justBefore, "cerrada");
    assert.equal(cerrada.semanaId, "2026-W35");
  });

  it("cierre 04:50 del lunes entra en la semana que termina; 05:10 no", () => {
    const enSemana = limaMs("2026-09-07", 4, 50);
    const fuera = limaMs("2026-09-07", 5, 10);
    const r = calcularReporteSemanal(
      baseInput({
        vehiculos: [
          veh({ id: "a", cierreAt: enSemana }),
          veh({ id: "b", cierreAt: enSemana + 1000 }),
          veh({ id: "c", cierreAt: enSemana + 2000 }),
          veh({ id: "d", cierreAt: enSemana + 3000 }),
          veh({ id: "e", cierreAt: enSemana + 4000 }),
          veh({ id: "fuera", cierreAt: fuera }),
        ],
      }),
    );
    assert.equal(r.estado, "SELLADO");
    const integ = r.virtudes.find((v) => v.id === "integridad")!;
    assert.equal(integ.evidencia.denominador, 5);
  });
});

describe("umbral mínimo", () => {
  it("A: 3 días con puerta, sin vehículos → SELLADO", () => {
    const r = calcularReporteSemanal(
      baseInput({
        planillas: [0, 1, 2].map((i) =>
          planilla(i, [
            seg({
              horaInicio: "08:00",
              horaFin: "10:00",
              activadoAt: limaMs(fechaW36(i), 8, 1),
              puertaTiming: "antes_voz",
              estado: "cerrado_manual",
            }),
          ]),
        ),
      }),
    );
    assert.equal(r.estado, "SELLADO");
    assert.ok(r.virtudes.some((v) => v.score != null));
  });

  it("B: 5 cierres no-centinela → SELLADO", () => {
    const r = calcularReporteSemanal(
      baseInput({
        vehiculos: [0, 1, 2, 3, 4].map((i) =>
          veh({ id: `v${i}`, cierreAt: limaMs(fechaW36(i), 12) }),
        ),
      }),
    );
    assert.equal(r.estado, "SELLADO");
  });

  it("C: 2 sellos diarios → SELLADO", () => {
    const r = calcularReporteSemanal(
      baseInput({
        sellos: [
          { fecha: fechaW36(0), selloEmitido: true, jornadaPlanMin: 240 },
          { fecha: fechaW36(1), selloEmitido: true, jornadaPlanMin: 240 },
        ],
      }),
    );
    assert.equal(r.estado, "SELLADO");
  });

  it("D: 3 días con anillo de ≥3 segmentos (puertas perdidas) → SELLADO", () => {
    const anillo = (i: number) =>
      planilla(
        i,
        ["08:00-10:00", "10:00-12:00", "12:00-14:00"].map((h) => {
          const [a, b] = h.split("-");
          return seg({
            horaInicio: a!,
            horaFin: b!,
            puertaSistema: true,
            estado: "entropia",
            activadoAt: limaMs(fechaW36(i), 8),
          });
        }),
      );
    const r = calcularReporteSemanal(baseInput({ planillas: [anillo(0), anillo(1), anillo(2)] }));
    assert.equal(r.estado, "SELLADO");
  });

  it("sin umbral → INSUFICIENTE, virtudes nulas, texto fijo", () => {
    const r = calcularReporteSemanal(
      baseInput({
        vehiculos: [veh({ id: "solo", cierreAt: limaMs(fechaW36(0), 12) })],
      }),
    );
    assert.equal(r.estado, "INSUFICIENTE");
    assert.equal(r.veredicto.patron, "insuficiente");
    assert.equal(r.veredicto.tension, TEXTO_INSUFICIENTE);
    assert.ok(r.virtudes.every((v) => v.score === null));
    assert.equal(r.selladoAt, null);
  });
});

describe("fórmulas y denominador 0", () => {
  it("sin planillas ni minutosPlan → Disposición null", () => {
    const r = calcularReporteSemanal(
      baseInput({
        vehiculos: [0, 1, 2, 3, 4].map((i) =>
          veh({ id: `v${i}`, cierreAt: limaMs(fechaW36(i), 12) }),
        ),
      }),
    );
    assert.equal(r.virtudes.find((v) => v.id === "disposicion")!.score, null);
    assert.equal(r.virtudes.find((v) => v.id === "disciplina")!.score, null);
    assert.equal(r.virtudes.find((v) => v.id === "termino")!.score, null);
  });

  it("puertaSistema no suma Disciplina", () => {
    const r = calcularReporteSemanal(
      baseInput({
        planillas: [0, 1, 2].map((i) =>
          planilla(i, [
            seg({
              horaInicio: "08:00",
              horaFin: "10:00",
              activadoAt: limaMs(fechaW36(i), 8),
              puertaSistema: true,
              estado: "entropia",
            }),
            seg({
              horaInicio: "10:00",
              horaFin: "12:00",
              activadoAt: limaMs(fechaW36(i), 10, 1),
              puertaTiming: "antes_voz",
              estado: "cerrado_manual",
            }),
          ]),
        ),
      }),
    );
    const d = r.virtudes.find((v) => v.id === "disciplina")!;
    assert.equal(d.evidencia.denominador, 6);
    assert.match(d.evidencia.hechos[0] ?? "", /3 puertas abiertas/);
    assert.match(d.evidencia.hechos[0] ?? "", /3 cierres conscientes/);
    assert.equal(d.score, 50);
  });

  it("cierre del sistema al horaFin no suma Término", () => {
    const r = calcularReporteSemanal(
      baseInput({
        planillas: [0, 1, 2].map((i) =>
          planilla(i, [
            seg({ horaInicio: "08:00", horaFin: "10:00", estado: "cerrado_manual", activadoAt: 1, puertaManual: true }),
            seg({ horaInicio: "10:00", horaFin: "12:00", estado: "cerrado_manual", activadoAt: 1, puertaManual: true }),
            seg({ horaInicio: "22:00", horaFin: "23:00", estado: "entropia", puertaSistema: true, activadoAt: 1 }),
          ]),
        ),
      }),
    );
    const t = r.virtudes.find((v) => v.id === "termino")!;
    assert.equal(t.score, 0);
    assert.equal(t.evidencia.numerador, 0);
    assert.equal(t.evidencia.denominador, 3);
  });

  it("Término cuenta cierre consciente del operador en la última franja", () => {
    const lastStart = limaMs(fechaW36(0), 22);
    const lastEnd = limaMs(fechaW36(0), 23);
    const v = veh({
      id: "term",
      cierreAt: lastStart + 30 * 60_000,
      cierreManual: true,
      status: "archivado",
    });
    assert.equal(isCierreConscienteAlTermino(v, lastStart, lastEnd), true);
    const r = calcularReporteSemanal(
      baseInput({
        planillas: [
          planilla(0, [
            seg({ horaInicio: "08:00", horaFin: "10:00", estado: "cerrado_manual", activadoAt: 1, puertaManual: true }),
            seg({ horaInicio: "22:00", horaFin: "23:00", estado: "entropia" }),
          ]),
          planilla(1, [
            seg({ horaInicio: "08:00", horaFin: "10:00", estado: "cerrado_manual", activadoAt: 1, puertaManual: true }),
            seg({ horaInicio: "22:00", horaFin: "23:00", estado: "cerrado_manual", activadoAt: 1, puertaManual: true }),
          ]),
          planilla(2, [
            seg({ horaInicio: "08:00", horaFin: "10:00", estado: "cerrado_manual", activadoAt: 1, puertaManual: true }),
            seg({ horaInicio: "22:00", horaFin: "23:00", estado: "entropia" }),
          ]),
        ],
        vehiculos: [v],
        ledgersTermino: [{ fecha: fechaW36(2), n: 1 }],
      }),
    );
    const t = r.virtudes.find((x) => x.id === "termino")!;
    assert.equal(t.score, 100);
    assert.equal(t.evidencia.numerador, 3);
  });

  it("centinela no cuenta como cierre (umbral B)", () => {
    const r = calcularReporteSemanal(
      baseInput({
        vehiculos: [
          veh({
            id: "c1",
            cierreAt: limaMs(fechaW36(0), 12),
            autoVerdad: true,
            titulo: "Modo Centinela",
          }),
          veh({
            id: "c2",
            cierreAt: limaMs(fechaW36(1), 12),
            autoVerdad: true,
            excluirDeHistorial: true,
            titulo: "x",
          }),
          veh({ id: "real", cierreAt: limaMs(fechaW36(2), 12) }),
        ],
      }),
    );
    assert.equal(isInvisibleCentinela({ id: "c", autoVerdad: true, titulo: "Modo Centinela" }), true);
    assert.equal(r.estado, "INSUFICIENTE");
  });
});

describe("patrones de veredicto", () => {
  it("Carga: Término bajo y ejecución alta", () => {
    const r = calcularReporteSemanal(
      baseInput({
        planillas: [0, 1, 2, 3, 4].map((i) =>
          planilla(i, [
            seg({
              horaInicio: "08:00",
              horaFin: "10:00",
              estado: "cerrado_manual",
              activadoAt: limaMs(fechaW36(i), 8, 1),
              puertaTiming: "antes_voz",
            }),
            seg({
              horaInicio: "10:00",
              horaFin: "12:00",
              estado: "cerrado_manual",
              activadoAt: limaMs(fechaW36(i), 10, 1),
              puertaTiming: "antes_voz",
            }),
            seg({
              horaInicio: "22:00",
              horaFin: "23:00",
              estado: "entropia",
              puertaSistema: true,
              activadoAt: limaMs(fechaW36(i), 22),
            }),
          ]),
        ),
        vehiculos: [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
          veh({
            id: `v${i}`,
            cierreAt: limaMs(fechaW36(i % 5), 11, i),
            cierreManual: true,
          }),
        ),
        snapshots: [0, 1, 2, 3, 4].map((i) => ({
          fecha: fechaW36(i),
          decisionesDelDia: 8,
        })),
      }),
    );
    assert.equal(r.veredicto.patron, "carga");
    assert.match(r.veredicto.tension, /lastre/);
    assert.equal(r.virtudBaja, "termino");
    assert.equal(r.codigoFriccion?.codigo, 8);
  });

  it("Sin ley: Disposición baja y Agencia alta", () => {
    const r = calcularReporteSemanal(
      baseInput({
        planillas: [
          planilla(0, [
            seg({ horaInicio: "08:00", horaFin: "09:00", estado: "cerrado_manual", activadoAt: 1, puertaManual: true }),
          ]),
        ],
        vehiculos: [0, 1, 2, 3, 4].map((i) =>
          veh({ id: `v${i}`, cierreAt: limaMs(fechaW36(0), 12, i) }),
        ),
        snapshots: [{ fecha: fechaW36(0), decisionesDelDia: 10 }],
        revelaciones: [{ fecha: fechaW36(0), minutosPlan: 60 }],
      }),
    );
    assert.equal(r.veredicto.patron, "sin_ley");
  });

  it("Puerta hueca: Disciplina baja y Agencia alta, con anillo", () => {
    const r = calcularReporteSemanal(
      baseInput({
        planillas: [0, 1, 2, 3].map((i) =>
          planilla(i, [
            seg({ horaInicio: "08:00", horaFin: "10:00", estado: "entropia", puertaSistema: true, activadoAt: 1 }),
            seg({ horaInicio: "10:00", horaFin: "12:00", estado: "entropia", puertaSistema: true, activadoAt: 1 }),
            seg({
              horaInicio: "22:00",
              horaFin: "23:00",
              estado: "cerrado_manual",
              puertaSistema: true,
              activadoAt: 1,
            }),
          ]),
        ),
        vehiculos: [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
          veh({ id: `v${i}`, cierreAt: limaMs(fechaW36(i % 4), 11, i) }),
        ),
        snapshots: [0, 1, 2, 3].map((i) => ({
          fecha: fechaW36(i),
          decisionesDelDia: 8,
        })),
      }),
    );
    assert.equal(r.veredicto.patron, "puerta_hueca");
  });
});

describe("delta vs semana previa y EN_CURSO", () => {
  it("aplica delta por virtud contra el sello anterior", () => {
    const previo = calcularReporteSemanal(
      baseInput({
        planillas: [0, 1, 2].map((i) =>
          planilla(i, [
            seg({
              horaInicio: "08:00",
              horaFin: "10:00",
              estado: "cerrado_manual",
              activadoAt: 1,
              puertaManual: true,
            }),
            seg({
              horaInicio: "10:00",
              horaFin: "12:00",
              estado: "entropia",
              puertaSistema: true,
              activadoAt: 1,
            }),
          ]),
        ),
      }),
    );
    const actual = calcularReporteSemanal(
      baseInput({
        reportePrevio: previo,
        planillas: [0, 1, 2, 3, 4].map((i) =>
          planilla(i, [
            seg({
              horaInicio: "08:00",
              horaFin: "10:00",
              estado: "cerrado_manual",
              activadoAt: 1,
              puertaManual: true,
            }),
            seg({
              horaInicio: "10:00",
              horaFin: "12:00",
              estado: "cerrado_manual",
              activadoAt: 1,
              puertaManual: true,
            }),
            seg({
              horaInicio: "22:00",
              horaFin: "23:00",
              estado: "cerrado_manual",
              activadoAt: 1,
              puertaManual: true,
            }),
          ]),
        ),
      }),
    );
    const disc = actual.virtudes.find((v) => v.id === "disciplina")!;
    assert.ok(disc.delta != null);
    assert.ok(disc.delta! > 0);
  });

  it("objetivo actual a mitad de semana → EN_CURSO", () => {
    const mid = limaMs(fechaW36(2), 15);
    const r = calcularReporteSemanal({
      nowMs: mid,
      objetivo: "actual",
      planillas: [0, 1, 2].map((i) =>
        planilla(i, [
          seg({
            horaInicio: "08:00",
            horaFin: "10:00",
            estado: "cerrado_manual",
            activadoAt: 1,
            puertaManual: true,
          }),
        ]),
      ),
    });
    assert.equal(r.estado, "EN_CURSO");
    assert.equal(r.semanaId, "2026-W36");
    assert.equal(r.selladoAt, null);
  });

  it("virtudes salen en orden de instalación", () => {
    const r = calcularReporteSemanal(
      baseInput({
        sellos: [
          { fecha: fechaW36(0), selloEmitido: true },
          { fecha: fechaW36(1), selloEmitido: true },
        ],
      }),
    );
    assert.deepEqual(
      r.virtudes.map((v) => v.id),
      ["disposicion", "disciplina", "integridad", "temple", "agencia", "termino"],
    );
  });
});
