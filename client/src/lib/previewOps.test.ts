import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  isDeployPreviewHost,
  isPreviewOpsUnlocked,
  setPreviewOpsUnlocked,
} from "./previewOps.ts";

describe("previewOps", () => {
  const originalWindow = globalThis.window;
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    // @ts-expect-error test stub
    globalThis.window = {
      location: { hostname: "deploy-preview-1--admirable-moxie-9f923a.netlify.app" },
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
    globalThis.window = { location: { hostname: "sistemicar.app" } };
    assert.equal(isDeployPreviewHost(), false);
    setPreviewOpsUnlocked(true);
    assert.equal(isPreviewOpsUnlocked(), false);
  });

  it("unlock solo en preview", () => {
    assert.equal(isPreviewOpsUnlocked(), false);
    setPreviewOpsUnlocked(true);
    assert.equal(isPreviewOpsUnlocked(), true);
    setPreviewOpsUnlocked(false);
    assert.equal(isPreviewOpsUnlocked(), false);
  });
});
