/**
 * Cuándo ofrecer el siguiente peldaño (Base → Ritmo → Norte).
 * El orden comercial ya existe en docs; esto lo delimita en la experiencia.
 *
 * - Base sin cierre: no se ofrece nada más. Primero mide unidades.
 * - Base con ≥1 Conquista cerrada: se ofrece Ritmo (no Norte).
 * - Ritmo sin segmentos: aún no Norte.
 * - Ritmo con estructura: se ofrece Norte (último).
 */

export type OfertaVehicleHint = {
  status?: string;
  tipoFlota?: string;
  cierreAt?: number;
};

export type OfertaMomento = {
  offerRitmo: boolean;
  offerNorte: boolean;
  nextPeldaño: "ritmo" | "norte" | null;
  reason:
    | "stack-completo"
    | "ritmo-con-segmentos"
    | "ritmo-sin-estructura"
    | "base-con-cierre"
    | "base-sin-cierre";
};

const CLOSED = new Set(["cumplido", "archivado", "fallado"]);

export function isClosedConquista(v: OfertaVehicleHint): boolean {
  if (!CLOSED.has(v.status ?? "")) return false;
  if (!(v.cierreAt ?? 0)) return false;
  if (v.tipoFlota === "situacion") return false;
  return true;
}

export function countClosedConquista(vehicles: readonly OfertaVehicleHint[]): number {
  return vehicles.filter(isClosedConquista).length;
}

export function resolveOfertaMomento(input: {
  hasRitmo: boolean;
  hasNorte: boolean;
  closedConquistaCount: number;
  segmentosCount: number;
}): OfertaMomento {
  if (input.hasNorte) {
    return {
      offerRitmo: false,
      offerNorte: false,
      nextPeldaño: null,
      reason: "stack-completo",
    };
  }

  if (input.hasRitmo) {
    const readyNorte = input.segmentosCount > 0;
    return {
      offerRitmo: false,
      offerNorte: readyNorte,
      nextPeldaño: readyNorte ? "norte" : null,
      reason: readyNorte ? "ritmo-con-segmentos" : "ritmo-sin-estructura",
    };
  }

  const readyRitmo = input.closedConquistaCount >= 1;
  return {
    offerRitmo: readyRitmo,
    offerNorte: false,
    nextPeldaño: readyRitmo ? "ritmo" : null,
    reason: readyRitmo ? "base-con-cierre" : "base-sin-cierre",
  };
}
