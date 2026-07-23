import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  isDeployPreviewHost,
  isPreviewOpsUnlocked,
  setPreviewOpsUnlocked,
  consumePreviewOpsQueryUnlock,
} from "./previewOps.ts";

describe("previewOps", () => {
  const originalWindow = globalThis.window;
  let sessionStore: Map<string, string>;
  let localStore: Map<string, string>;

  beforeEach(() => {
    sessionStore = new Map();
    localStore = new Map();
    // @ts-expect-error test stub
    globalThis.window = {
      location: {
        hostname: "deploy-preview-1--admirable-moxie-9f923a.netlify.app",
        pathname: "/menu",
        search: "",
        hash: "",
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
    globalThis.window = { location: { hostname: "sistemicar.app", search: "" } };
    assert.equal(isDeployPreviewHost(), false);
    setPreviewOpsUnlocked(true);
    assert.equal(isPreviewOpsUnlocked(), false);
  });

  it("unlock solo en preview (session + local)", () => {
    assert.equal(isPreviewOpsUnlocked(), false);
    setPreviewOpsUnlocked(true);
    assert.equal(isPreviewOpsUnlocked(), true);
    assert.equal(sessionStore.get("sistemicar_preview_ops_v1"), "1");
    assert.equal(localStore.get("sistemicar_preview_ops_v1"), "1");
    setPreviewOpsUnlocked(false);
    assert.equal(isPreviewOpsUnlocked(), false);
  });

  it("consumePreviewOpsQueryUnlock lee ?preview_ops=1", () => {
    // @ts-expect-error test stub
    globalThis.window.location.search = "?preview_ops=1";
    assert.equal(consumePreviewOpsQueryUnlock(), true);
    assert.equal(isPreviewOpsUnlocked(), true);
  });
});
