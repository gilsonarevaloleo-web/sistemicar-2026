import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  vehicleCuentaComoDireccion,
  feedsProyectoHub,
  resolveDestinoCierre,
} from "./destinoCierre.ts";
import {
  computeRachaNombrar,
  computeUbicacionConcienciaDia,
  isTituloPresenciaNombrada,
  shiftJournalFecha,
  PRESENCIA_NOMBRAR_DIAS,
} from "./ubicacionConciencia.ts";
import type { SegmentoV5, Vehicle } from "./persistence.ts";

const FECHA = "2026-08-19";

function lima(hhmm: string, day = FECHA): number {
  return Date.parse(`${day}T${hhmm}:00-05:00`);
}

function seg(
  partial: Partial<SegmentoV5> & Pick<SegmentoV5, "id">
): SegmentoV5 {
  return {
    nombre: partial.nombre ?? "Franja",
    horaInicio: partial.horaInicio ?? "09:00",
    horaFin: partial.horaFin ?? "10:00",
    color: "#fff",
    icono: "o",
    estado: "pendiente",
    eventos: [],
    psGanados: 0,
    ...partial,
  };
}

function veh(partial: Partial<Vehicle> & Pick<Vehicle, "id">): Vehicle {
  return {
    titulo: "Costura manga",
    criterioFin: "circunstancia",
    criterioDetalle: "",
    tiempoInicio: new Date(),
    ejes: {
      enfoque: { text: "", trifecta: "omitir" },
      conflicto: { text: "", trifecta: "omitir" },
      pasos: { text: "", trifecta: "omitir" },
      limite: { text: "", trifecta: "omitir" },
    },
    status: "activo",
    userId: "u1",
    createdAt: new Date(),
    ...partial,
  } as Vehicle;
}

describe("vehicleCuentaComoDireccion", () => {
  it("peldano sin casa es presencia extraída — no mancha Dirección", () => {
    assert.equal(feedsProyectoHub(resolveDestinoCierre("peldano")), true);
    assert.equal(vehicleCuentaComoDireccion({ destinoCierre: "peldano" }), false);
    assert.equal(
      vehicleCuentaComoDireccion({ destinoCierre: "peldano", proyectoId: "n1" }),
      true
    );
    assert.equal(
      vehicleCuentaComoDireccion({
        destinoCierre: "peldano",
        oleadaPuntoId: "pt1",
      }),
      true
    );
    assert.equal(
      vehicleCuentaComoDireccion({ destinoCierre: "presencia", proyectoId: "n1" }),
      false
    );
  });
});

describe("nombrar presencia — 21 días", () => {
  it("título genérico no cuenta", () => {
    assert.equal(isTituloPresenciaNombrada(""), false);
    assert.equal(isTituloPresenciaNombrada("Vehículo"), false);
    assert.equal(isTituloPresenciaNombrada("ab"), false);
    assert.equal(isTituloPresenciaNombrada("Costura manga"), true);
  });

  it("racha consecutiva; el día en curso no rompe", () => {
    assert.equal(shiftJournalFecha("2026-08-19", -1), "2026-08-18");
    assert.equal(
      computeRachaNombrar(["2026-08-17", "2026-08-18", "2026-08-19"], "2026-08-19"),
      3
    );
    assert.equal(
      computeRachaNombrar(["2026-08-17", "2026-08-18"], "2026-08-19"),
      2
    );
    assert.equal(computeRachaNombrar(["2026-08-10"], "2026-08-19"), 0);
    assert.equal(PRESENCIA_NOMBRAR_DIAS, 21);
  });
});

describe("computeUbicacionConcienciaDia", () => {
  const now = lima("12:00");

  it("sin plan → vacío", () => {
    const r = computeUbicacionConcienciaDia({
      segmentos: [],
      vehicles: [],
      nowMs: now,
    });
    assert.equal(r.ubicacion, "vacio");
    assert.match(r.headline, /no fue convocada/);
  });

  it("vuelo: hay trabajo y las puertas se perdieron", () => {
    const r = computeUbicacionConcienciaDia({
      segmentos: [
        seg({
          id: "s1",
          estado: "entropia",
          horaInicio: "09:00",
          horaFin: "10:00",
        }),
        seg({
          id: "s2",
          estado: "entropia",
          horaInicio: "10:00",
          horaFin: "11:00",
        }),
      ],
      vehicles: [
        veh({
          id: "v1",
          aperturaAt: lima("09:20"),
          destinoCierre: "presencia",
          titulo: "Costura manga",
        }),
      ],
      nowMs: now,
    });
    assert.equal(r.ubicacion, "vuelo");
    assert.match(r.headline, /volando/);
    assert.ok(r.vehiculosEjecucion >= 1);
    assert.ok(r.puertasPerdidas >= 1);
  });

  it("voluntad: presencia nombrada sin Norte", () => {
    const r = computeUbicacionConcienciaDia({
      segmentos: [
        seg({
          id: "s1",
          estado: "cerrado_manual",
          horaInicio: "09:00",
          horaFin: "10:00",
          activadoAt: lima("09:01"),
          cerradoAt: lima("10:00"),
          puertaTiming: "antes_voz",
        }),
        seg({
          id: "s2",
          estado: "cerrado_manual",
          horaInicio: "10:00",
          horaFin: "11:00",
          activadoAt: lima("10:00"),
          cerradoAt: lima("11:00"),
          puertaTiming: "antes_voz",
        }),
      ],
      vehicles: [
        veh({
          id: "v1",
          status: "cumplido",
          aperturaAt: lima("09:05"),
          cierreAt: lima("10:05"),
          destinoCierre: "presencia",
          titulo: "Costura manga",
        }),
      ],
      nowMs: now,
      rachaNombrar: 5,
    });
    assert.equal(r.ubicacion, "voluntad");
    assert.match(r.headline, /voluntad/);
    assert.match(r.mandato, /Día 5 de 21/);
    assert.equal(r.vehiculosPresenciaNombrada, 1);
  });

  it("orden: dirección con casa, puertas habitadas", () => {
    const r = computeUbicacionConcienciaDia({
      segmentos: [
        seg({
          id: "s1",
          estado: "cerrado_manual",
          horaInicio: "09:00",
          horaFin: "10:00",
          activadoAt: lima("09:00"),
          cerradoAt: lima("10:00"),
          puertaTiming: "antes_voz",
        }),
        seg({
          id: "s2",
          estado: "cerrado_manual",
          horaInicio: "10:00",
          horaFin: "11:00",
          activadoAt: lima("10:00"),
          cerradoAt: lima("11:00"),
          puertaTiming: "antes_voz",
        }),
      ],
      vehicles: [
        veh({
          id: "v1",
          status: "cumplido",
          aperturaAt: lima("09:05"),
          cierreAt: lima("11:00"),
          destinoCierre: "peldano",
          proyectoId: "nido-1",
          oleadaPuntoId: "pt-1",
          titulo: "Busos",
        }),
      ],
      nowMs: now,
    });
    assert.equal(r.ubicacion, "orden");
    assert.match(r.headline, /orden/);
    assert.ok(r.minutosDireccion > r.minutosPresencia);
  });

  it("suelo: puertas abiertas aunque el trabajo sea modesto", () => {
    const r = computeUbicacionConcienciaDia({
      segmentos: [
        seg({
          id: "s1",
          estado: "cerrado_manual",
          horaInicio: "09:00",
          horaFin: "10:00",
          activadoAt: lima("09:00"),
          cerradoAt: lima("10:00"),
          puertaTiming: "antes_voz",
        }),
        seg({
          id: "s2",
          estado: "cerrado_manual",
          horaInicio: "10:00",
          horaFin: "11:00",
          activadoAt: lima("10:01"),
          cerradoAt: lima("11:00"),
          puertaTiming: "antes_voz",
        }),
        seg({
          id: "s3",
          estado: "cerrado_manual",
          horaInicio: "11:00",
          horaFin: "12:00",
          activadoAt: lima("11:00"),
          cerradoAt: lima("12:00"),
          puertaTiming: "antes_voz",
        }),
      ],
      vehicles: [],
      nowMs: now,
    });
    assert.equal(r.ubicacion, "suelo");
    assert.match(r.headline, /suelo/);
  });

  it("peldano sin casa no cuenta como Dirección", () => {
    const r = computeUbicacionConcienciaDia({
      segmentos: [
        seg({
          id: "s1",
          estado: "cerrado_manual",
          horaInicio: "09:00",
          horaFin: "12:00",
          activadoAt: lima("09:00"),
          cerradoAt: lima("12:00"),
          puertaTiming: "antes_voz",
        }),
      ],
      vehicles: [
        veh({
          id: "falso",
          status: "cumplido",
          aperturaAt: lima("09:00"),
          cierreAt: lima("10:00"),
          destinoCierre: "peldano",
          titulo: "Costura manga",
        }),
      ],
      nowMs: now,
    });
    assert.equal(r.vehiculosDireccion, 0);
    assert.equal(r.vehiculosPresencia, 1);
    assert.ok(r.minutosPresencia > 0);
    assert.equal(r.minutosDireccion, 0);
  });
});
