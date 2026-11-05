import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEPOSITO_V2_TAB_IDS,
  depositoV2TabMeta,
  isDepositoV2Tab,
} from "./v2Tabs.ts";

describe("deposito v2 tabs", () => {
  it("ordena Volcar → Lectura → Casa", () => {
    assert.deepEqual(DEPOSITO_V2_TAB_IDS, ["volcar", "lectura", "casa"]);
    assert.equal(depositoV2TabMeta("volcar").step, "01");
    assert.equal(depositoV2TabMeta("lectura").title, "Muro");
    assert.equal(isDepositoV2Tab("volcar"), true);
    assert.equal(isDepositoV2Tab("auditar"), false);
  });
});
