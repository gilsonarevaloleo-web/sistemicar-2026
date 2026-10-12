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
      src.indexOf("export async function findAccountsWithData"),
      src.indexOf("export function subscribeToAcervo"),
    );
    assert.match(fn, /activeModules/);
    assert.match(fn, /pickLatestProgressionDoc/);
  });
});
