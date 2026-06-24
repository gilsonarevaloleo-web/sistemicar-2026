import assert from "node:assert/strict";
import { describe, it, afterEach, beforeEach } from "node:test";
import {
  FLOTA_FETCH_TIMEOUT_MS,
  VISIBILITY_RETURN_DEBOUNCE_MS,
  beginFlotaFetch,
  completeFlotaFetch,
  failFlotaFetchTimeout,
  getFlotaFetchStatus,
  isFlotaFetchCurrent,
  onJornadaVisibilityReturn,
  resetJornadaFlotaFetchForTests,
  retryFlotaFetch,
  armFlotaFetchTimeout,
  setFlotaPaintedCount,
  shouldAcceptFlotaFetchResponse,
} from "./jornadaFlotaFetch.ts";

describe("jornadaFlotaFetch", () => {
  beforeEach(() => {
    resetJornadaFlotaFetchForTests();
  });

  afterEach(() => {
    resetJornadaFlotaFetchForTests();
  });

  it("beginFlotaFetch cancela generación anterior", () => {
    const a = beginFlotaFetch();
    const b = beginFlotaFetch();
    assert.equal(isFlotaFetchCurrent(a.generation), false);
    assert.equal(isFlotaFetchCurrent(b.generation), true);
    assert.equal(getFlotaFetchStatus(), "loading");
  });

  it("pintado optimista mantiene ready", () => {
    const session = beginFlotaFetch({ hasOptimisticPaint: true });
    assert.equal(getFlotaFetchStatus(), "ready");
    assert.equal(isFlotaFetchCurrent(session.generation), true);
  });

  it("completeFlotaFetch solo aplica a generación vigente", () => {
    const a = beginFlotaFetch();
    const b = beginFlotaFetch();
    completeFlotaFetch(a.generation);
    assert.equal(getFlotaFetchStatus(), "loading");
    completeFlotaFetch(b.generation);
    assert.equal(getFlotaFetchStatus(), "ready");
  });

  it("timeout a los 6s si no hay vehículos pintados", async () => {
    const { generation } = beginFlotaFetch();
    armFlotaFetchTimeout(generation);
    await new Promise(resolve => setTimeout(resolve, FLOTA_FETCH_TIMEOUT_MS + 50));
    assert.equal(getFlotaFetchStatus(), "timeout");
    assert.equal(shouldAcceptFlotaFetchResponse(generation), true);
  });

  it("timeout con vehículos pintados no bloquea UI", async () => {
    const { generation } = beginFlotaFetch();
    setFlotaPaintedCount(3);
    armFlotaFetchTimeout(generation);
    await new Promise(resolve => setTimeout(resolve, FLOTA_FETCH_TIMEOUT_MS + 50));
    assert.equal(getFlotaFetchStatus(), "ready");
  });

  it("retryFlotaFetch reinicia sesión tras timeout", () => {
    const first = beginFlotaFetch();
    failFlotaFetchTimeout(first.generation);
    assert.equal(getFlotaFetchStatus(), "timeout");
    const retry = retryFlotaFetch({ hasOptimisticPaint: true });
    assert.equal(getFlotaFetchStatus(), "ready");
    assert.equal(isFlotaFetchCurrent(retry.generation), true);
  });

  it("debounce: 10 encolados rápidos solo ejecutan un handler", async () => {
    let calls = 0;
    onJornadaVisibilityReturn(() => {
      calls += 1;
    });
    const { queueVisibilityReturnForTests } = await import("./jornadaFlotaFetch.ts");

    for (let i = 0; i < 10; i++) {
      queueVisibilityReturnForTests();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    await new Promise(resolve => setTimeout(resolve, VISIBILITY_RETURN_DEBOUNCE_MS + 50));
    assert.equal(calls, 1);
  });
});
