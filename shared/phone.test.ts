import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasValidClientPhone,
  normalizeClientPhone,
  pickClientPhone,
  pickClientPhoneFromSources,
} from "./phone.ts";

describe("phone — WhatsApp del cliente", () => {
  it("9 dígitos peruanos pasan a +51", () => {
    assert.equal(normalizeClientPhone("918260514"), "+51918260514");
    assert.equal(normalizeClientPhone("918 260 514"), "+51918260514");
  });

  it("respeta el + si ya viene internacional", () => {
    assert.equal(normalizeClientPhone("+5215512345678"), "+5215512345678");
    assert.equal(normalizeClientPhone("+51 918 260 514"), "+51918260514");
  });

  it("rechaza números cortos o vacíos", () => {
    assert.equal(normalizeClientPhone("12345"), null);
    assert.equal(normalizeClientPhone(""), null);
    assert.equal(hasValidClientPhone(null), false);
    assert.equal(hasValidClientPhone("abc"), false);
  });

  it("elige remoto válido, si no el local", () => {
    assert.equal(pickClientPhone("+51918260514", "999888777"), "+51918260514");
    assert.equal(pickClientPhone("", "999888777"), "+51999888777");
    assert.equal(pickClientPhone("x", null), null);
  });

  it("no pierde un número ya guardado si el remoto viene vacío", () => {
    assert.equal(pickClientPhone(null, "+51918260514"), "+51918260514");
    assert.equal(pickClientPhone("", "918260514"), "+51918260514");
    assert.equal(
      pickClientPhoneFromSources(null, "", "x", "918 260 514"),
      "+51918260514",
    );
  });
});
