import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  isDeployPreviewHost,
  isPreviewOpsUnlocked,
  setPreviewOpsUnlocked,
  hideNetlifyDrawerIfNeeded,
  previewPlaneacionHref,
} from "./previewOps.ts";

describe("previewOps", () => {
  const originalWindow = globalThis.window;
  let store: Map<string, string>;
  let replacedHref: string | null;

  beforeEach(() => {
    store = new Map();
    replacedHref = null;
    // @ts-expect-error test stub
    globalThis.window = {
      location: {
        hostname: "deploy-preview-13--admirable-moxie-9f923a.netlify.app",
        href: "https://deploy-preview-13--admirable-moxie-9f923a.netlify.app/",
        replace(url: string) {
          replacedHref = url;
        },
      },
    };
    // @ts-expect-error test stub
    globalThis.sessionStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("detecta host de deploy preview", () => {
    assert.equal(isDeployPreviewHost(), true);
  });

  it("no desbloquea producción", () => {
    // @ts-expect-error test stub
    globalThis.window = {
      location: {
        hostname: "sistemicar.app",
        href: "https://sistemicar.app/",
        replace() {},
      },
    };
    assert.equal(isDeployPreviewHost(), false);
    assert.equal(setPreviewOpsUnlocked(true), false);
    assert.equal(isPreviewOpsUnlocked(), false);
  });

  it("unlock solo en preview y reporta éxito", () => {
    assert.equal(isPreviewOpsUnlocked(), false);
    assert.equal(setPreviewOpsUnlocked(true), true);
    assert.equal(isPreviewOpsUnlocked(), true);
    assert.equal(setPreviewOpsUnlocked(false), true);
    assert.equal(isPreviewOpsUnlocked(), false);
  });

  it("hideNetlifyDrawerIfNeeded redirige si falta el query", () => {
    assert.equal(hideNetlifyDrawerIfNeeded(), true);
    assert.ok(replacedHref);
    assert.match(replacedHref!, /ntl-drawer-state=hidden/);
  });

  it("hideNetlifyDrawerIfNeeded no-op si ya está oculto", () => {
    // @ts-expect-error test stub
    globalThis.window.location.href =
      "https://deploy-preview-13--admirable-moxie-9f923a.netlify.app/?ntl-drawer-state=hidden";
    assert.equal(hideNetlifyDrawerIfNeeded(), false);
    assert.equal(replacedHref, null);
  });

  it("previewPlaneacionHref es path limpio (sin query)", () => {
    assert.equal(previewPlaneacionHref(), "/planeacion");
  });
});
