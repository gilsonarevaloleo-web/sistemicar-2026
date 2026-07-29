import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isJornada4Path, JORNADA_V4_PATH } from "./jornadaBrand.ts";

describe("jornadaBrand", () => {
  it("detecta /jornada-v4 y query", () => {
    assert.equal(isJornada4Path(JORNADA_V4_PATH), true);
    assert.equal(isJornada4Path("/jornada-v4?x=1"), true);
    assert.equal(isJornada4Path("/planeacion"), false);
    assert.equal(isJornada4Path("/jornada-v3"), false);
    assert.equal(isJornada4Path("/menu"), false);
  });
});
