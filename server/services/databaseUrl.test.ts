import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDatabaseUrl } from "./databaseUrl.ts";

describe("resolveDatabaseUrl", () => {
  it("toma NETLIFY_DATABASE_URL si DATABASE_URL no está", () => {
    assert.equal(
      resolveDatabaseUrl({
        NETLIFY_DATABASE_URL: "postgres://neon",
      }),
      "postgres://neon",
    );
  });

  it("prefiere DATABASE_URL", () => {
    assert.equal(
      resolveDatabaseUrl({
        DATABASE_URL: "postgres://a",
        NETLIFY_DATABASE_URL: "postgres://b",
      }),
      "postgres://a",
    );
  });

  it("vacío si no hay ninguna", () => {
    assert.equal(resolveDatabaseUrl({}), "");
  });
});
