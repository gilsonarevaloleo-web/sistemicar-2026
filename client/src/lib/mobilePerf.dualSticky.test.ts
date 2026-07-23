import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  isCoarseConcienciaDevice,
  resetCoarseConcienciaStickyForTests,
} from "./concienciaClock.ts";
import {
  isDualOperationalLoad,
  situacionCupoPollMs,
} from "./mobilePerf.ts";
import { MAX_OPERATIONAL_SLOTS } from "./vehicleOperationalSlots.ts";

describe("mobile sticky + dual desglosadores", () => {
  const prevWindow = globalThis.window;
  const prevMatch = globalThis.matchMedia;

  beforeEach(() => {
    resetCoarseConcienciaStickyForTests();
  });

  afterEach(() => {
    resetCoarseConcienciaStickyForTests();
    if (prevWindow === undefined) {
      // @ts-expect-error restore
      delete globalThis.window;
    } else {
      globalThis.window = prevWindow;
    }
    if (prevMatch === undefined) {
      // @ts-expect-error restore
      delete globalThis.matchMedia;
    } else {
      globalThis.matchMedia = prevMatch;
    }
  });

  function stubMatchMedia(opts: { coarse: boolean; narrow: boolean }) {
    const media = (query: string) => ({
      matches:
        (query.includes("pointer: coarse") && opts.coarse) ||
        (query.includes("max-width") && opts.narrow),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
      onchange: null,
    });
    // @ts-expect-error test stub
    globalThis.window = { matchMedia: media };
    globalThis.matchMedia = media as typeof matchMedia;
  }

  it("sticky: landscape ancho no apaga coarse tras sesión móvil", () => {
    stubMatchMedia({ coarse: true, narrow: true });
    assert.equal(isCoarseConcienciaDevice(), true);

    // Simula rotación a landscape (>768) sin dejar de ser touch.
    stubMatchMedia({ coarse: true, narrow: false });
    assert.equal(isCoarseConcienciaDevice(), true);

    // Incluso si coarse query fallara, sticky de sesión se mantiene.
    stubMatchMedia({ coarse: false, narrow: false });
    assert.equal(isCoarseConcienciaDevice(), true);
  });

  it("dual load: cupo más lento con 2 slots (conquista + situacional)", () => {
    assert.equal(MAX_OPERATIONAL_SLOTS, 2);
    assert.equal(isDualOperationalLoad(1), false);
    assert.equal(isDualOperationalLoad(2), true);
    assert.equal(situacionCupoPollMs(2), 4_000);
    assert.ok(situacionCupoPollMs(1) <= 2_500);
  });
});
