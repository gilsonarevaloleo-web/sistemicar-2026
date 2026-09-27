import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  captureAdAttributionFromUrl,
  getAdAttribution,
  getAdVideoLabel,
} from "./adAttribution.ts";

const memory = new Map<string, string>();

function installLocalStorage() {
  const localStorage = {
    getItem(key: string) {
      return memory.has(key) ? memory.get(key)! : null;
    },
    setItem(key: string, value: string) {
      memory.set(key, value);
    },
    removeItem(key: string) {
      memory.delete(key);
    },
    clear() {
      memory.clear();
    },
  };
  (globalThis as { window?: unknown; localStorage?: unknown }).window = {
    localStorage,
  };
  (globalThis as { localStorage?: unknown }).localStorage = localStorage;
}

describe("persistencia atribución anuncio", () => {
  beforeEach(() => {
    memory.clear();
    installLocalStorage();
  });

  it("guarda VIDEO A y no lo pierde si la siguiente URL no trae utm_content", () => {
    captureAdAttributionFromUrl(
      "?utm_source=facebook&utm_content=video_a&fbclid=IwAR1",
    );
    assert.equal(getAdVideoLabel(), "VIDEO A");
    captureAdAttributionFromUrl("?utm_medium=paid");
    assert.equal(getAdAttribution()?.utmContent, "video_a");
    assert.equal(getAdAttribution()?.fbclid, "IwAR1");
    assert.equal(getAdAttribution()?.utmMedium, "paid");
  });

  it("cambia a VIDEO B si el segundo clic es el otro anuncio", () => {
    captureAdAttributionFromUrl("?utm_content=video_a");
    captureAdAttributionFromUrl("?utm_content=video_b");
    assert.equal(getAdVideoLabel(), "VIDEO B");
  });
});
