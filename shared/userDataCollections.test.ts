import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMigratedDocData,
  collectionsToMigrate,
  featureCountsFromCollections,
  LEGACY_ALIAS_COLLECTIONS,
  RECOVERY_FEATURE_COLLECTIONS,
  RECOVERY_SCAN_COLLECTIONS,
  uidFromPrivateCollectionPath,
  USER_PRIVATE_COLLECTIONS,
} from "./userDataCollections.ts";

describe("userDataCollections — recuperación tras limpieza del dispositivo", () => {
  it("incluye Crisol, Récord, Rutina, Depósito y Umbral", () => {
    const set = new Set<string>(USER_PRIVATE_COLLECTIONS);
    assert.equal(set.has("situacionReserva"), true);
    assert.equal(set.has("vehicleHistory"), true);
    assert.equal(set.has("plantillasRutina"), true);
    assert.equal(set.has("planillas"), true);
    assert.equal(set.has("volcados"), true);
    assert.equal(set.has("volcados_v3"), true);
    assert.equal(set.has("umbralLogros"), true);
    assert.equal(set.has("umbralOfertas"), true);
    assert.equal(set.has("proyectos"), true);
  });

  it("no usa los nombres viejos como canónicos", () => {
    const set = new Set<string>(USER_PRIVATE_COLLECTIONS);
    assert.equal(set.has("hopeLog"), false);
    assert.equal(set.has("bossSteps"), false);
    assert.equal(set.has("hopeLogs"), true);
    assert.equal(set.has("bossStep"), true);
    assert.equal(LEGACY_ALIAS_COLLECTIONS.includes("hopeLog"), true);
    assert.equal(LEGACY_ALIAS_COLLECTIONS.includes("bossSteps"), true);
  });

  it("agrupa conteos por recinto visible", () => {
    const features = featureCountsFromCollections({
      situacionReserva: 4,
      proyectos: 2,
      vehicleHistory: 9,
      plantillasRutina: 1,
      volcados_v3: 7,
      umbralLogros: 3,
    });
    assert.equal(features.crisol, 6);
    assert.equal(features.record, 9);
    assert.equal(features.rutina, 1);
    assert.equal(features.deposito, 7);
    assert.equal(features.umbral, 3);
  });

  it("la migración reescribe el uid y deja rastro del origen", () => {
    const out = buildMigratedDocData({ texto: "paso", userId: "anon-1" }, "google-2", "anon-1");
    assert.equal(out.userId, "google-2");
    assert.equal(out.migratedFrom, "anon-1");
    assert.equal(out.texto, "paso");
  });

  it("el escaneo no depende de tener puntos en progression", () => {
    assert.ok(RECOVERY_SCAN_COLLECTIONS.includes("situacionReserva"));
    assert.ok(RECOVERY_SCAN_COLLECTIONS.includes("vehicleHistory"));
    assert.ok(RECOVERY_SCAN_COLLECTIONS.includes("plantillasRutina"));
    assert.ok(RECOVERY_SCAN_COLLECTIONS.includes("volcados_v3"));
    assert.ok(RECOVERY_SCAN_COLLECTIONS.includes("umbralLogros"));
    assert.ok(RECOVERY_SCAN_COLLECTIONS.includes("sovereigntyPointsLog"));
    assert.equal(uidFromPrivateCollectionPath(
      "artifacts/sistemicar-v2-5/users/abc123/situacionReserva/x",
      "situacionReserva",
    ), "abc123");
  });

  it("la lista a migrar cubre canónicas + alias", () => {
    const all = collectionsToMigrate();
    assert.ok(all.length >= USER_PRIVATE_COLLECTIONS.length + LEGACY_ALIAS_COLLECTIONS.length);
    for (const name of Object.values(RECOVERY_FEATURE_COLLECTIONS).flat()) {
      assert.ok(all.includes(name), `falta ${name}`);
    }
  });
});
