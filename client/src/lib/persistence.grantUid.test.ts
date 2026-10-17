import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, "persistence.ts"), "utf8");

describe("grantModulesToUid — no usa la progresión local de Gilson", () => {
  it("lee y escribe el UID remoto, no getLocalProgression", () => {
    const fn = src.slice(
      src.indexOf("export async function grantModulesToUid"),
      src.indexOf("export function getClientMode"),
    );
    assert.match(fn, /pickLatestProgressionDoc/);
    assert.match(fn, /activeModules/);
    assert.doesNotMatch(fn, /getLocalProgression/);
    assert.doesNotMatch(fn, /saveLocalProgression/);
  });

  it("findAccountsWithData expone si Jornada ya está encendida", () => {
    const fn = src.slice(
      src.indexOf("function accountFromProgData"),
      src.indexOf("export function subscribeToAcervo"),
    );
    assert.match(fn, /activeModules/);
    assert.match(fn, /collectionGroup/);
  });
});

describe("migrateDataToNewUid — recuperación completa", () => {
  const fn = src.slice(
    src.indexOf("export async function migrateDataToNewUid"),
    src.indexOf("const LOCAL_RECOVERY_KEYS"),
  );

  it("copia con setDoc y la lista canónica, no los nombres viejos sueltos", () => {
    assert.match(fn, /collectionsToMigrate/);
    assert.match(fn, /setDoc/);
    assert.match(fn, /buildMigratedDocData/);
    assert.doesNotMatch(fn, /hopeLog", "bossSteps/);
    assert.doesNotMatch(fn, /addDoc\(collection\(db, newPath\)/);
  });

  it("detecta sesión local vacía para no migrar el anónimo nuevo", () => {
    assert.match(src, /export function localAccountLooksEmpty/);
    assert.match(src, /sistemicar_situacion_reserva/);
    assert.match(src, /sistemicar_volcados_v3/);
  });
});
