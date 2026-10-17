import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

describe("recuperación de cuenta — admin", () => {
  it("expone inventario y restore por UID", () => {
    const src = readFileSync(join(dir, "index.ts"), "utf8");
    assert.match(src, /\/api\/admin\/recovery\/inventory/);
    assert.match(src, /\/api\/admin\/recovery\/restore/);
    assert.match(src, /\/api\/admin\/recovery\/accounts/);
    assert.match(src, /inventoryUserCollections/);
    assert.match(src, /restoreUserData/);
    assert.match(src, /listRecoveryAccounts/);
  });

  it("el admin SDK copia la lista canónica con merge", () => {
    const src = readFileSync(join(dir, "firebaseAdmin.ts"), "utf8");
    assert.match(src, /export async function inventoryUserCollections/);
    assert.match(src, /export async function restoreUserData/);
    assert.match(src, /collectionsToMigrate/);
    assert.match(src, /buildMigratedDocData/);
    assert.match(src, /\{ merge: true \}/);
    assert.match(src, /export async function listRecoveryAccounts/);
    assert.match(src, /RECOVERY_SCAN_COLLECTIONS/);
    assert.match(src, /gilsonarevalo.leo@gmail.com/);
  });
});
