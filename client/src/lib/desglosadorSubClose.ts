import { validateSubCloseCantidad, SUB_APERTURA_ACTIVATION_SKEW_MS } from "@/lib/desglosadorClock";
import type { SubVehiculo } from "@/lib/persistence";
import { enrichSubRutaCierre } from "@/lib/rutaSeguimiento";
import type { RutaBandaId } from "@/lib/rutaEnfoque";

export type DesglosadorSubCloseResult = {
  subs: SubVehiculo[];
  closedSub: SubVehiculo;
  nextActiveSubId: string | null;
};

/** Cierra un sub por id (sin índices). Activa el siguiente pendiente si existe. */
export function buildDesglosadorSubClose(
  subs: SubVehiculo[],
  subId: string,
  status: "cumplido" | "fallado",
  cantidad: number,
  duracionCompletado: number | undefined,
  rutaDeclarada: RutaBandaId[] | undefined,
  now = Date.now()
): DesglosadorSubCloseResult | null {
  const allSubs = [...subs];
  const idx = allSubs.findIndex(s => s.id === subId);
  if (idx === -1) return null;

  const cantidadCheck = validateSubCloseCantidad(allSubs[idx], String(cantidad), status);
  if (!cantidadCheck.ok) return null;

  const cantidadFinal = cantidadCheck.cantidad;
  const baseSub: SubVehiculo = {
    ...allSubs[idx],
    status,
    cierreAt: now,
    duracionFinal: duracionCompletado,
    ...(allSubs[idx].cantidadObjetivo ? { cantidadLograda: cantidadFinal } : {}),
  };
  allSubs[idx] =
    baseSub.rutaEnfoque?.activa
      ? enrichSubRutaCierre(baseSub, rutaDeclarada ?? [])
      : baseSub;

  const closedSub = allSubs[idx];
  const nextPending = allSubs.findIndex((s, i) => i > idx && s.status === "pendiente");
  let nextActiveSubId: string | null = null;
  if (nextPending !== -1) {
    nextActiveSubId = allSubs[nextPending].id;
    allSubs[nextPending] = {
      ...allSubs[nextPending],
      status: "activo",
      aperturaAt: now + SUB_APERTURA_ACTIVATION_SKEW_MS,
    };
  }

  return { subs: allSubs, closedSub, nextActiveSubId };
}
