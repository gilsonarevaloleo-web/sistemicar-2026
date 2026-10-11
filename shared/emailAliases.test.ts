import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emailMatchKeys,
  emailsLikelySameMailbox,
  normalizeBuyerEmail,
} from "./emailAliases.ts";

describe("emailAliases — pago y cuenta Google", () => {
  it("normaliza mayúsculas y espacios", () => {
    assert.equal(normalizeBuyerEmail("  Tina@Gmail.com "), "tina@gmail.com");
  });

  it("trata puntos y +tag de Gmail como el mismo buzón", () => {
    assert.equal(
      emailsLikelySameMailbox("tina.pino@gmail.com", "tinapino@gmail.com"),
      true,
    );
    assert.equal(
      emailsLikelySameMailbox("tina+yape@gmail.com", "tina@gmail.com"),
      true,
    );
    assert.equal(
      emailsLikelySameMailbox("tina.pino+pago@googlemail.com", "tinapino@gmail.com"),
      true,
    );
  });

  it("no mezcla buzones distintos", () => {
    assert.equal(
      emailsLikelySameMailbox("tina@gmail.com", "karina@gmail.com"),
      false,
    );
    assert.equal(
      emailsLikelySameMailbox("tina@outlook.com", "tina@gmail.com"),
      false,
    );
  });

  it("incluye el correo exacto primero para no pisar otra cuenta Firebase", () => {
    const keys = emailMatchKeys("tina.pino+yape@gmail.com");
    assert.equal(keys[0], "tina.pino+yape@gmail.com");
    assert.ok(keys.includes("tinapino@gmail.com"));
  });
});
