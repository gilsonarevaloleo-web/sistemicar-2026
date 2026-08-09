/**
 * Ledger local de PS Umbral v2 (anti-abuso intento/pase/módulo).
 * Persistencia localStorage; los PS se otorgan vía awardSovereigntyPoints.
 */

import {
  emptyUmbralV2PsLedger,
  resolveUmbralV2PsAwards,
  type ResolveUmbralV2PsInput,
  type ResolveUmbralV2PsResult,
  type UmbralPsAward,
  type UmbralV2PsLedger,
} from "@shared/umbral/pointsConfig";
import { awardSovereigntyPoints } from "@/lib/persistence";

const STORAGE_PREFIX = "umbral_v2_ps_ledger_";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadUmbralV2PsLedger(userId: string): UmbralV2PsLedger {
  if (typeof localStorage === "undefined") return emptyUmbralV2PsLedger();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return emptyUmbralV2PsLedger();
    const parsed = JSON.parse(raw) as Partial<UmbralV2PsLedger>;
    return {
      version: 1,
      pasesCobrados: Array.isArray(parsed.pasesCobrados)
        ? parsed.pasesCobrados.map(String)
        : [],
      modulosCobrados: Array.isArray(parsed.modulosCobrados)
        ? (parsed.modulosCobrados.filter(
            (m) => m === "INTERNO_HABILIDAD" || m === "EXTERNO_VENTAS",
          ) as UmbralV2PsLedger["modulosCobrados"])
        : [],
      intentosHistoricos: Array.isArray(parsed.intentosHistoricos)
        ? parsed.intentosHistoricos.map(String)
        : [],
      intentosPorDia:
        parsed.intentosPorDia && typeof parsed.intentosPorDia === "object"
          ? Object.fromEntries(
              Object.entries(parsed.intentosPorDia).map(([k, v]) => [
                k,
                Array.isArray(v) ? v.map(String) : [],
              ]),
            )
          : {},
    };
  } catch {
    return emptyUmbralV2PsLedger();
  }
}

export function saveUmbralV2PsLedger(
  userId: string,
  ledger: UmbralV2PsLedger,
): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(ledger));
  } catch (e) {
    console.error("[umbralV2PsLedger] No se pudo guardar ledger:", e);
  }
}

export interface AwardUmbralV2PsResult extends ResolveUmbralV2PsResult {
  awarded: UmbralPsAward[];
}

/**
 * Calcula, persiste ledger y otorga PS. Idempotente respecto a anti-abuso.
 */
export async function awardUmbralV2PsForEvaluation(
  userId: string,
  input: ResolveUmbralV2PsInput,
): Promise<AwardUmbralV2PsResult> {
  const prev = loadUmbralV2PsLedger(userId);
  const resolved = resolveUmbralV2PsAwards(input, prev);
  saveUmbralV2PsLedger(userId, resolved.ledger);

  for (const award of resolved.awards) {
    try {
      await awardSovereigntyPoints(userId, award.amount, award.source);
    } catch (e) {
      console.error("[umbralV2Ps] Error otorgando PS:", award.source, e);
    }
  }

  return { ...resolved, awarded: resolved.awards };
}
