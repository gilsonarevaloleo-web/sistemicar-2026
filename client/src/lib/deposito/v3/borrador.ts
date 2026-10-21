/** Borrador del laboratorio V3. Sobrevive recarga y cambio de pestaña. */

export const DEPOSITO_V3_DRAFT_KEY = "sistemicar_deposito_v3_draft";

export interface BorradorDepositoV3 {
  rawFact: string;
  detectedNoise: string;
  omittedShadow: string;
  studentHypothesis: string;
}

export const BORRADOR_VACIO: BorradorDepositoV3 = {
  rawFact: "",
  detectedNoise: "",
  omittedShadow: "",
  studentHypothesis: "",
};

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function leerBorradorDepositoV3(): BorradorDepositoV3 {
  try {
    const raw = storage()?.getItem(DEPOSITO_V3_DRAFT_KEY);
    if (!raw) return { ...BORRADOR_VACIO };
    const parsed = JSON.parse(raw) as Partial<BorradorDepositoV3>;
    return {
      rawFact: String(parsed.rawFact ?? ""),
      detectedNoise: String(parsed.detectedNoise ?? ""),
      omittedShadow: String(parsed.omittedShadow ?? ""),
      studentHypothesis: String(parsed.studentHypothesis ?? ""),
    };
  } catch {
    return { ...BORRADOR_VACIO };
  }
}

export function guardarBorradorDepositoV3(draft: BorradorDepositoV3): void {
  try {
    storage()?.setItem(DEPOSITO_V3_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // cuota / modo privado
  }
}

export function limpiarBorradorDepositoV3(): void {
  try {
    storage()?.removeItem(DEPOSITO_V3_DRAFT_KEY);
  } catch {
    // ignore
  }
}
