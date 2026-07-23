import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  isDeployPreviewHost,
  isPreviewOpsUnlocked,
  setPreviewOpsUnlocked,
  consumePreviewOpsQueryUnlock,
  hideNetlifyDrawerIfNeeded,
  previewPlaneacionHref,
} from "./previewOps.ts";

describe("previewOps", () => {
  const originalWindow = globalThis.window;
  let sessionStore: Map<string, string>;
  let localStore: Map<string, string>;
  let replacedHref: string | null;

  beforeEach(() => {
    sessionStore = new Map();
    localStore = new Map();
    replacedHref = null;
    // @ts-expect-error test stub
    globalThis.window = {
      location: {
        hostname: "deploy-preview-13--admirable-moxie-9f923a.netlify.app",
        pathname: "/menu",
        search: "",
        hash: "",
        href: "https://deploy-preview-13--admirable-moxie-9f923a.netlify.app/",
        replace(url: string) {
          replacedHref = url;
        },
      },
      history: { replaceState: () => {} },
      dispatchEvent: () => true,
    };
    // @ts-expect-error test stub
    globalThis.sessionStorage = {
      getItem: (k: string) => sessionStore.get(k) ?? null,
      setItem: (k: string, v: string) => {
        sessionStore.set(k, v);
      },
      removeItem: (k: string) => {
        sessionStore.delete(k);
      },
    };
    // @ts-expect-error test stub
    globalThis.localStorage = {
      getItem: (k: string) => localStore.get(k) ?? null,
      setItem: (k: string, v: string) => {
        localStore.set(k, v);
      },
      removeItem: (k: string) => {
        localStore.delete(k);
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
        search: "",
        replace() {},
      },
    };
    assert.equal(isDeployPreviewHost(), false);
    assert.equal(setPreviewOpsUnlocked(true), false);
    assert.equal(isPreviewOpsUnlocked(), false);
  });

  it("unlock solo en preview (session + local)", () => {
    assert.equal(isPreviewOpsUnlocked(), false);
    assert.equal(setPreviewOpsUnlocked(true), true);
    assert.equal(isPreviewOpsUnlocked(), true);
    assert.equal(sessionStore.get("sistemicar_preview_ops_v1"), "1");
    assert.equal(localStore.get("sistemicar_preview_ops_v1"), "1");
    assert.equal(setPreviewOpsUnlocked(false), true);
    assert.equal(isPreviewOpsUnlocked(), false);
  });

  it("consumePreviewOpsQueryUnlock lee ?preview_ops=1", () => {
    // @ts-expect-error test stub
    globalThis.window.location.search = "?preview_ops=1";
    assert.equal(consumePreviewOpsQueryUnlock(), true);
    assert.equal(isPreviewOpsUnlocked(), true);
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
