import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFlotaActivosRenderList, dedupeVehiclesById } from "./flotaRenderUtils.ts";
import type { Vehicle } from "@/lib/persistence";

function v(id: string, extra?: Partial<Vehicle>): Vehicle {
  return {
    id,
    titulo: id,
    status: "activo",
    tipoFlota: "tiempo",
    ...extra,
  } as Vehicle;
}

describe("flotaRenderUtils", () => {
  it("dedupeVehiclesById O(n) — última aparición gana", () => {
    const a = v("a", { titulo: "first" });
    const a2 = v("a", { titulo: "second" });
    const out = dedupeVehiclesById([a, v("b"), a2]);
    assert.equal(out.length, 2);
    assert.equal(out.find(x => x.id === "a")?.titulo, "second");
  });

  it("buildFlotaActivosRenderList sin duplicados", () => {
    const operativa = [v("1", { tipoTerminoRapido: "hora" })];
    const panoramica = [v("1", { tipoTerminoRapido: "omitido" }), v("2", { tipoTerminoRapido: "omitido" })];
    const activos = [v("1"), v("3")];
    const out = buildFlotaActivosRenderList(operativa, panoramica, activos);
    assert.deepEqual(out.map(x => x.id), ["1", "2", "3"]);
  });
});
