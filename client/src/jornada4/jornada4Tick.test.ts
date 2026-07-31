import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

describe("jornada4Tick burst coalesce", () => {
  it("coalescea burstJornada4Tick en requestAnimationFrame", () => {
    const src = readFileSync(join(dir, "jornada4Tick.ts"), "utf8");
    assert.match(src, /burstJornada4Tick/);
    assert.match(src, /requestAnimationFrame/);
    assert.match(src, /burstRaf/);
  });
});

describe("anti-freeze Dual Kernel session", () => {
  it("sesión no importa useJornada4Tick ni Pulso en el root", () => {
    const session = readFileSync(join(dir, "../pages/jornadaV4Session.tsx"), "utf8");
    assert.match(session, /mobileTab === "metricas"/);
    assert.match(session, /mobileTab === "plan"/);
    assert.equal(session.includes("useJornada4Tick"), false);
    assert.equal(session.includes("usePulsoCobertura"), false);
    assert.equal(session.includes("Jornada4Boveda"), false);
    assert.match(session, /lazy\(\(\) => import\("@\/components\/jornada4\/Jornada4PlanTab"\)\)/);
    assert.match(
      session,
      /lazy\(\s*\(\) => import\("@\/components\/jornada4\/Jornada4MetricasTab"\)\s*\)/
    );
  });

  it("disciplina tickea solo dentro de MetricasTab (isla)", () => {
    const metricas = readFileSync(
      join(dir, "../components/jornada4/Jornada4MetricasTab.tsx"),
      "utf8"
    );
    assert.match(metricas, /useJornada4Tick\(Boolean\(userId\)\)/);
    assert.match(metricas, /Jornada4Boveda/);
  });

  it("Pulso solo monta en PlanTab", () => {
    const plan = readFileSync(
      join(dir, "../components/jornada4/Jornada4PlanTab.tsx"),
      "utf8"
    );
    assert.match(plan, /usePulsoCobertura/);
    assert.match(plan, /useJornada4Tick/);
  });

  it("SituacionCard solo tickea con cron activo", () => {
    const card = readFileSync(
      join(dir, "../components/jornada4/SituacionCard.tsx"),
      "utf8"
    );
    assert.match(card, /useJornada4Tick\(cronActivo\)/);
    assert.equal(card.includes("useJornada4Tick(true)"), false);
  });

  it("atención de puertas no usa useJornada4Tick (sin setState root)", () => {
    const attn = readFileSync(
      join(dir, "../hooks/useJornada4SegmentAttention.ts"),
      "utf8"
    );
    assert.match(attn, /subscribeJornada4Tick/);
    assert.equal(attn.includes("useJornada4Tick"), false);
  });
});
