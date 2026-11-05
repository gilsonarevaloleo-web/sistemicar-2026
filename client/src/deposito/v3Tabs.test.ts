import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEPOSITO_V3_TAB_IDS,
  depositoV3TabMeta,
  isDepositoV3Tab,
} from "./v3Tabs.ts";

describe("deposito v3 tabs", () => {
  it("ordena Auditar → Casa → Huella, como Operar / Plan / Métricas", () => {
    assert.deepEqual(DEPOSITO_V3_TAB_IDS, ["auditar", "casa", "huella"]);
    assert.equal(depositoV3TabMeta("auditar").step, "01");
    assert.equal(depositoV3TabMeta("casa").step, "02");
    assert.equal(depositoV3TabMeta("huella").step, "03");
    assert.equal(isDepositoV3Tab("auditar"), true);
    assert.equal(isDepositoV3Tab("operar"), false);
  });
});
