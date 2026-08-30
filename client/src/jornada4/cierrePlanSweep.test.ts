import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Vehicle } from "../lib/persistence.ts";
import {
  applyBonoCierreConsciente,
  BONO_DISCIPLINA_POR_CIERRE,
  BONO_DISCIPLINA_TOPE,
  bonoDisciplinaDesdeCierres,
  collectCierresConscientesAlTermino,
  isCierreConscienteAlTermino,
  recordCierresConscientesPlan,
  vehiclesToCloseAtPlanEnd,
} from "./cierrePlanSweep.ts";

function lima(hhmm: string): number {
  return Date.parse(`2026-08-19T${hhmm}:00-05:00`);
}

function v(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return partial as Vehicle;
}

function installLocalStorage() {
  if (typeof globalThis.localStorage !== "undefined") {
    globalThis.localStorage.clear();
    return;
  }
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, val: string) => {
      store.set(k, val);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

const LAST_START = lima("20:00");
const PLAN_END = lima("23:00");

describe("cierrePlanSweep", () => {
  beforeEach(() => installLocalStorage());

  it("el sistema cierra activos conscientes; descanso no cuenta", () => {
    const list = vehiclesToCloseAtPlanEnd([
      v({ id: "a", status: "activo", tipoFlota: "tiempo" }),
      v({ id: "b", status: "archivado", tipoFlota: "tiempo" }),
      v({ id: "c", status: "activo", tipoFlota: "descanso" }),
      v({ id: "d", status: "activo", autoVerdad: true }),
    ]);
    assert.deepEqual(
      list.map(x => x.id),
      ["a"]
    );
  });

  it("cierre consciente = operador en la última franja; el del sistema no", () => {
    assert.equal(
      isCierreConscienteAlTermino(
        { status: "archivado", cierreAt: lima("22:40"), cierreManual: true },
        LAST_START,
        PLAN_END
      ),
      true
    );
    assert.equal(
      isCierreConscienteAlTermino(
        { status: "archivado", cierreAt: lima("22:40"), cierreManual: false },
        LAST_START,
        PLAN_END
      ),
      false
    );
    assert.equal(
      isCierreConscienteAlTermino(
        { status: "archivado", cierreAt: lima("19:50") },
        LAST_START,
        PLAN_END
      ),
      false
    );
    assert.equal(
      isCierreConscienteAlTermino(
        { status: "activo", cierreAt: lima("22:40") },
        LAST_START,
        PLAN_END
      ),
      false
    );
  });

  it("collect solo ids conscientes de la última hora", () => {
    const ids = collectCierresConscientesAlTermino(
      [
        v({
          id: "mano",
          status: "cumplido",
          cierreAt: lima("22:50"),
        }),
        v({
          id: "sistema",
          status: "archivado",
          cierreAt: lima("23:00"),
          cierreManual: false,
        }),
        v({
          id: "manana",
          status: "archivado",
          cierreAt: lima("11:00"),
        }),
      ],
      LAST_START,
      PLAN_END
    );
    assert.deepEqual(ids, ["mano"]);
  });

  it("bono +5% por cierre, tope 15%; disciplina no pasa de 120", () => {
    assert.equal(bonoDisciplinaDesdeCierres(1), BONO_DISCIPLINA_POR_CIERRE);
    assert.equal(bonoDisciplinaDesdeCierres(3), BONO_DISCIPLINA_TOPE);
    assert.equal(bonoDisciplinaDesdeCierres(9), BONO_DISCIPLINA_TOPE);
    assert.equal(applyBonoCierreConsciente(100, 15), 115);
    assert.equal(applyBonoCierreConsciente(118, 15), 120);
  });

  it("ledger es idempotente por vehicleId", () => {
    const a = recordCierresConscientesPlan("u1", ["v1"], "2026-08-19");
    assert.deepEqual(a.nuevos, ["v1"]);
    assert.equal(a.ledger.bonoPct, 5);
    const b = recordCierresConscientesPlan("u1", ["v1", "v2"], "2026-08-19");
    assert.deepEqual(b.nuevos, ["v2"]);
    assert.equal(b.ledger.n, 2);
    assert.equal(b.ledger.bonoPct, 10);
  });
});
