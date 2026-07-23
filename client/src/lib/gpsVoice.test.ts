import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  GPS_CLIP_PACKS,
  gpsClipUrl,
  ringBienvenidaClipIds,
  resetGpsVoiceForTests,
} from "./gpsVoice.ts";

describe("gpsVoice packs", () => {
  beforeEach(() => {
    resetGpsVoiceForTests();
  });

  it("ringBienvenidaClipIds distingue primera ronda y siguiente", () => {
    assert.deepEqual(ringBienvenidaClipIds(1), [...GPS_CLIP_PACKS.ringBienvenidaPrimera]);
    assert.deepEqual(ringBienvenidaClipIds(2), [...GPS_CLIP_PACKS.ringBienvenidaSiguiente]);
    assert.equal(ringBienvenidaClipIds(1).length, 3);
    assert.equal(ringBienvenidaClipIds(2).length, 2);
  });

  it("gpsClipUrl apunta a /voice/*.mp3", () => {
    assert.equal(gpsClipUrl("conquista-intro-a"), "/voice/conquista-intro-a.mp3");
  });

  it("packs de conquista tienen intro y bandas", () => {
    assert.ok(GPS_CLIP_PACKS.conquistaIntro.includes("conquista-intro-a"));
    assert.ok(GPS_CLIP_PACKS.conquistaConcentrado.length >= 2);
    assert.ok(GPS_CLIP_PACKS.conquistaLimite.length >= 2);
  });
});
