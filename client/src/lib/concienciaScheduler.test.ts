import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  drainBudgetedQueue,
  enqueueConcienciaWork,
  getConcienciaSchedulerStats,
  resetConcienciaSchedulerForTests,
} from "./concienciaScheduler.ts";

describe("concienciaScheduler budget queue", () => {
  afterEach(() => {
    resetConcienciaSchedulerForTests();
  });

  it("coalesce: misma key reemplaza trabajo pendiente", () => {
    const runs: string[] = [];
    enqueueConcienciaWork({
      key: "segment",
      priority: "segment",
      run: () => {
        runs.push("a");
      },
    });
    enqueueConcienciaWork({
      key: "segment",
      priority: "segment",
      run: () => {
        runs.push("b");
      },
    });
    assert.equal(getConcienciaSchedulerStats().queueLength, 1);
    assert.equal(getConcienciaSchedulerStats().skippedCoalesceCount, 1);
    drainBudgetedQueue(50);
    assert.deepEqual(runs, ["b"]);
    assert.equal(getConcienciaSchedulerStats().queueLength, 0);
  });

  it("respeta prioridad high antes que segment y low", () => {
    const order: string[] = [];
    enqueueConcienciaWork({
      key: "low",
      priority: "low",
      run: () => {
        order.push("low");
      },
    });
    enqueueConcienciaWork({
      key: "seg",
      priority: "segment",
      run: () => {
        order.push("segment");
      },
    });
    enqueueConcienciaWork({
      key: "hi",
      priority: "high",
      run: () => {
        order.push("high");
      },
    });
    drainBudgetedQueue(100);
    assert.deepEqual(order, ["high", "segment", "low"]);
  });

  it("presupuesto: deja trabajo pendiente si el slice se agota", () => {
    let heavy = true;
    enqueueConcienciaWork({
      key: "heavy",
      priority: "high",
      run: () => {
        const end = performance.now() + 8;
        while (performance.now() < end) {
          /* burn */
        }
        heavy = false;
      },
    });
    enqueueConcienciaWork({
      key: "light",
      priority: "low",
      run: () => {
        /* noop */
      },
    });
    drainBudgetedQueue(4);
    assert.equal(heavy, false);
    assert.equal(getConcienciaSchedulerStats().queueLength, 1);
    drainBudgetedQueue(20);
    assert.equal(getConcienciaSchedulerStats().queueLength, 0);
  });
});
