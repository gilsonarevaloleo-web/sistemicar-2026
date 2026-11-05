import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEPOSITO_V2_PATH,
  DEPOSITO_V3_PATH,
  isDepositoPath,
  isDepositoV2Path,
  isDepositoV3Path,
} from "./depositoBrand.ts";

describe("depositoBrand", () => {
  it("V3 vive en /esperanza y acepta alias", () => {
    assert.equal(DEPOSITO_V3_PATH, "/esperanza");
    assert.equal(isDepositoV3Path("/esperanza"), true);
    assert.equal(isDepositoV3Path("/esperanza/x"), true);
    assert.equal(isDepositoV3Path("/deposito"), true);
    assert.equal(isDepositoV3Path("/deposito-v3"), true);
    assert.equal(isDepositoV3Path("/deposito-v2"), false);
  });

  it("V2 vive en /deposito-v2", () => {
    assert.equal(DEPOSITO_V2_PATH, "/deposito-v2");
    assert.equal(isDepositoV2Path("/deposito-v2"), true);
    assert.equal(isDepositoV2Path("/deposito-v2?grado=2"), true);
    assert.equal(isDepositoV2Path("/esperanza"), false);
  });

  it("isDepositoPath cubre ambos recintos", () => {
    assert.equal(isDepositoPath("/esperanza"), true);
    assert.equal(isDepositoPath("/deposito-v2"), true);
    assert.equal(isDepositoPath("/jornada-v4"), false);
  });
});
