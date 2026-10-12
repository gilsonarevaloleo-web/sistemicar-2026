import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, "claimPurchases.ts"), "utf8");

describe("claimPendingPurchases — sin service account", () => {
  it("enciende el módulo en el celular si el servidor no puede escribir Firestore", () => {
    assert.match(src, /applyOnClient/);
    assert.match(src, /activateModulesForUser/);
    assert.match(src, /confirm-client-apply/);
  });
});
