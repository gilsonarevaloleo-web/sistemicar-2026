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
  'from "@/lib/situacionAlerts"',
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
      join(clientSrc, "hooks/useJornada4Tick.ts"),
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
});
