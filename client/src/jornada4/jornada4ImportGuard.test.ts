import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const clientSrc = join(dir, "..");

const BANNED = [
  'from "@/hooks/useDesglosadorManager"',
  'from "@/engines/ConcienciaEngine"',
  'from "@/lib/concienciaScheduler"',
  'from "@/lib/concienciaClock"',
  'from "@/lib/escaleraConcienciaEngine"',
  'from "@/lib/disciplinaEngine"',
  'from "@/lib/desglosadorVoice"',
  'from "@/lib/desglosadorVoiceDispatch"',
  'from "@/lib/situacionAlerts"',
  'from "@/lib/gpsVoice"',
  'from "@/lib/puntoCeroVoice"',
  'from "@/lib/speechQueue"',
  'useIslandConcienciaClock',
];

function walkTsFiles(root: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(root)) {
    const full = join(root, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules") continue;
      out.push(...walkTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") && !name.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("Jornada 4 Dual Kernel import guard", () => {
  it("entry no importa manager ni conciencia/voz", () => {
    const entry = readFileSync(join(clientSrc, "pages/jornadaV4.tsx"), "utf8");
    for (const ban of BANNED) {
      assert.equal(entry.includes(ban), false, `jornadaV4.tsx no debe contener ${ban}`);
    }
    assert.match(entry, /useJornada4Core/);
    assert.match(entry, /lazy\(\(\) => import\("\.\/jornadaV4Session"\)\)/);
  });

  it("sesión no importa manager ni conciencia/voz", () => {
    const session = readFileSync(join(clientSrc, "pages/jornadaV4Session.tsx"), "utf8");
    for (const ban of BANNED) {
      assert.equal(session.includes(ban), false, `jornadaV4Session.tsx no debe contener ${ban}`);
    }
    assert.match(session, /useJornada4Ops/);
  });

  it("árbol jornada4 + hooks J4 sin motores prohibidos", () => {
    const roots = [
      join(clientSrc, "jornada4"),
      join(clientSrc, "hooks/useJornada4Core.ts"),
      join(clientSrc, "hooks/useJornada4Ops.ts"),
      join(clientSrc, "hooks/useJornada4Crisol.ts"),
      join(clientSrc, "hooks/useJornada4Tick.ts"),
      join(clientSrc, "hooks/useJornada4Planilla.ts"),
      join(clientSrc, "hooks/useJornada4PuertaAlerts.ts"),
      join(clientSrc, "hooks/useJornada4SegmentAttention.ts"),
      join(clientSrc, "hooks/useJornada4EntrenamientoGuard.ts"),
      join(clientSrc, "hooks/useJornada4PlanEnd.ts"),
      join(clientSrc, "components/jornada4"),
    ];
    const files: string[] = [];
    for (const r of roots) {
      const st = statSync(r);
      if (st.isDirectory()) files.push(...walkTsFiles(r));
      else files.push(r);
    }
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const ban of BANNED) {
        assert.equal(
          src.includes(ban),
          false,
          `${file} no debe importar/usar ${ban}`
        );
      }
    }
  });

  it("kernels, tick y launch no importan gpsClip (fuera del hot path)", () => {
    const names = [
      "conquistaKernel.ts",
      "situacionKernel.ts",
      "jornada4Tick.ts",
      "executeJornada4Launch.ts",
    ];
    for (const name of names) {
      const src = readFileSync(join(dir, name), "utf8");
      assert.equal(
        src.includes("gpsClip"),
        false,
        `${name} no debe importar el reproductor GPS`
      );
      assert.equal(src.includes("speechSynthesis"), false, `${name} sin TTS`);
    }
  });

  it("sesión cablea El Crisol (dock clásico; gated por Norte)", () => {
    const session = readFileSync(join(clientSrc, "pages/jornadaV4Session.tsx"), "utf8");
    assert.match(session, /PlaneacionCrisolDock/);
    assert.match(session, /useJornada4Crisol/);
    assert.match(session, /elevateAboveUnitFocus/);
    assert.match(session, /entitlements\.hasNorte/);
  });

  it("sesión monta atención de puertas Dual Kernel", () => {
    const session = readFileSync(join(clientSrc, "pages/jornadaV4Session.tsx"), "utf8");
    assert.match(session, /useJornada4SegmentAttention/);
    assert.match(session, /computePuertaPanorama/);
  });

  it("sesión difería Plan/Métricas (sin Pulso/recharts en el chunk Operar)", () => {
    const session = readFileSync(join(clientSrc, "pages/jornadaV4Session.tsx"), "utf8");
    assert.match(session, /Jornada4PlanTab/);
    assert.match(session, /Jornada4MetricasTab/);
    assert.equal(session.includes('from "@/hooks/usePulsoCobertura"'), false);
    assert.equal(session.includes('from "@/components/jornada4/Jornada4Boveda"'), false);
    assert.equal(session.includes('from "recharts"'), false);
    // Toasts sí; tick UI de badges no (false = sin setState root cada 1s).
    assert.match(session, /useJornada4PuertaAlerts\(planillaApi\.planilla, Boolean\(user\), false\)/);
    assert.match(session, /useJornada4PlanEnd/);
    assert.match(session, /Jornada4RevelacionCard/);
    assert.equal(session.includes("useJornada4Tick"), false);
    assert.equal(session.includes("HubRendicionTiempo"), false);
  });

  it("Hub Escalera no monta rendición per-proyecto", () => {
    const hub = readFileSync(join(clientSrc, "pages/proyectos.tsx"), "utf8");
    assert.equal(hub.includes("HubRendicionTiempo"), false);
    assert.equal(hub.includes("buildProyectoRendicion"), false);
  });

  it("triada de Métricas no arrastra pulso ni reloj 1s", () => {
    const hook = readFileSync(
      join(clientSrc, "hooks/useConcienciaTriadaOperador.ts"),
      "utf8"
    );
    assert.equal(hook.includes('from "@/hooks/usePulsoCobertura"'), false);
    assert.equal(hook.includes('from "@/engines/ConcienciaEngine"'), false);
    assert.equal(hook.includes('from "@/lib/concienciaClock"'), false);
    assert.equal(hook.includes("useJornada4Tick"), false);
    assert.equal(hook.includes("useIslandConcienciaClock"), false);
    assert.match(hook, /requestIdleCallback/);
    assert.match(hook, /hasTriadaActiveVehicle/);
    const metricas = readFileSync(
      join(clientSrc, "components/jornada4/Jornada4MetricasTab.tsx"),
      "utf8"
    );
    assert.equal(metricas.includes('from "@/hooks/usePulsoCobertura"'), false);
    assert.equal(metricas.includes('from "@/engines/ConcienciaEngine"'), false);
  });
});
