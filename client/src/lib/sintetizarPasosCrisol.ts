/**
 * Sintetiza el log infinito de pasos del Crisol.
 * Miles de ejecuciones del mismo título (Bolsillo × 847) no merecen
 * una lista: se agrupan para devolver la atención al timón.
 */
import type { ProyectoPasoEjecutado } from "./proyectos";

export type PasoCrisolFamilia = {
  key: string;
  texto: string;
  count: number;
  lastStatus: ProyectoPasoEjecutado["status"];
  lastTs?: number;
  firstN: number;
};

export type PasosCrisolSintesis = {
  familias: PasoCrisolFamilia[];
  total: number;
  unicos: number;
  repetidos: number;
};

export function normalizarTituloPaso(texto: string): string {
  return texto.trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

export function sintetizarPasosCrisol(
  pasos: ProyectoPasoEjecutado[]
): PasosCrisolSintesis {
  const map = new Map<string, PasoCrisolFamilia>();

  for (const paso of pasos) {
    const texto = (paso.texto ?? "").trim();
    const key = normalizarTituloPaso(texto);
    if (!key) continue;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        texto,
        count: 1,
        lastStatus: paso.status,
        lastTs: paso.ts,
        firstN: paso.n,
      });
      continue;
    }

    existing.count += 1;
    const ts = paso.ts ?? 0;
    const prev = existing.lastTs ?? 0;
    if (ts >= prev) {
      existing.lastStatus = paso.status;
      existing.lastTs = paso.ts;
      existing.texto = texto;
    }
  }

  const familias = Array.from(map.values()).sort((a, b) => {
    const ts = (b.lastTs ?? 0) - (a.lastTs ?? 0);
    if (ts !== 0) return ts;
    if (b.count !== a.count) return b.count - a.count;
    return a.firstN - b.firstN;
  });

  const total = pasos.length;
  return {
    familias,
    total,
    unicos: familias.length,
    repetidos: Math.max(0, total - familias.length),
  };
}
