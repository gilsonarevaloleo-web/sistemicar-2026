/**
 * Bóveda de récord — localStorage + Firebase + API.
 * Compartida por Jornada clásica y Dual Kernel (V4).
 */
import { auth } from "./firebase";
import {
  saveVehicleHistoryFirebase,
  type VehicleHistoryEntry,
} from "./persistence";
import { HISTORY_MEASURE_ARROW } from "./vehicleHistoryMeasure";

export {
  HISTORY_MEASURE_ARROW,
  cleanHistorySubTitulo,
  measureKeyFromHistoryTitulo,
  measureTituloFromHistoryTitulo,
} from "./vehicleHistoryMeasure";

const VEHICLE_HISTORY_KEY = "sistemicar_vehicle_history";
const MAX_ENTRIES = 200;

export type SaveVehicleHistoryOpts = {
  status?: "cumplido" | "incumplido" | "fallado";
  excluirDeHistorial?: boolean;
  cumplidos?: number;
  fallados?: number;
  totalSubs?: number;
  subResumen?: VehicleHistoryEntry["subResumen"];
};

/** Lee el historial local (bóveda de récord). */
export function readVehicleHistoryLocal(): VehicleHistoryEntry[] {
  try {
    const data = localStorage.getItem(VEHICLE_HISTORY_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? (parsed as VehicleHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda una medición en la bóveda de récord.
 * Tras Cumplido: alimenta alternativas de escritura (≤5) y secuencia de desglose.
 */
export function saveVehicleHistoryEntry(
  titulo: string,
  minPerUnit: number,
  totalMin: number,
  tipoReloj: string,
  userId?: string,
  opts?: SaveVehicleHistoryOpts
): void {
  if (opts?.excluirDeHistorial) return;
  const title = titulo.trim();
  if (!title) return;
  try {
    const history = readVehicleHistoryLocal();
    const newEntry: VehicleHistoryEntry = {
      titulo: title,
      minPerUnit,
      totalMin,
      tipoReloj,
      fecha: Date.now(),
      ...opts,
    };
    history.push(newEntry);
    if (history.length > MAX_ENTRIES) {
      history.splice(0, history.length - MAX_ENTRIES);
    }
    localStorage.setItem(VEHICLE_HISTORY_KEY, JSON.stringify(history));

    if (userId) {
      void saveVehicleHistoryFirebase(userId, history).catch(e =>
        console.warn("[vehicleHistory] Firebase save error:", e)
      );
      const user = auth?.currentUser;
      if (user) {
        void user
          .getIdToken()
          .then(token =>
            fetch("/api/vehicle-history", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                entries: [
                  {
                    titulo: newEntry.titulo,
                    minPerUnit: newEntry.minPerUnit,
                    totalMin: newEntry.totalMin,
                    tipoReloj: newEntry.tipoReloj,
                    fecha: newEntry.fecha,
                    status: newEntry.status,
                    subResumen: newEntry.subResumen
                      ? JSON.stringify(newEntry.subResumen)
                      : undefined,
                  },
                ],
              }),
            })
          )
          .then(r => {
            if (r && !r.ok) {
              console.warn("[vehicleHistory] Backend save non-2xx:", r.status);
            }
          })
          .catch(e => console.warn("[vehicleHistory] Backend save error:", e));
      }
    }
  } catch (e) {
    console.warn("[vehicleHistory] local save failed:", e);
  }
}

/** Tras Cumplido de una unidad desglosador: `Misión → Unidad` + min/u. */
export function recordDesglosadorSubHistory(
  missionTitulo: string,
  sub: {
    titulo: string;
    status?: string;
    cantidadLograda?: number;
    duracionFinal?: number;
    excluirDeHistorial?: boolean;
  },
  userId?: string
): void {
  if (sub.excluirDeHistorial) return;
  if (sub.status !== "cumplido") return;
  const logradas = sub.cantidadLograda ?? 0;
  const durSec = sub.duracionFinal ?? 0;
  if (logradas <= 0 || durSec <= 0) return;
  const minPerUnit = durSec / 60 / logradas;
  const totalMin = durSec / 60;
  saveVehicleHistoryEntry(
    `${missionTitulo}${HISTORY_MEASURE_ARROW}${sub.titulo}`,
    minPerUnit,
    totalMin,
    "desglosador",
    userId,
    { status: "cumplido" }
  );
}

/** Al cerrar ciclo: entrada padre `desglosador_ciclo` (subs ya se grabaron en Cumplido). */
export function recordDesglosadorCycleHistory(
  vehicle: {
    titulo: string;
    subVehiculos?: Array<{
      titulo: string;
      status: string;
      cantidadObjetivo?: number;
      cantidadLograda?: number;
      duracionFinal?: number;
      excluirDeHistorial?: boolean;
    }>;
    aperturaAt?: number;
    cierreAt?: number;
  },
  userId?: string
): void {
  const subs = vehicle.subVehiculos ?? [];
  const closed = subs.filter(s => s.status === "cumplido" || s.status === "fallado");
  if (closed.length === 0) return;
  const cumplidos = closed.filter(s => s.status === "cumplido").length;
  const fallados = closed.filter(s => s.status === "fallado").length;
  const duracionFinal =
    vehicle.cierreAt != null && vehicle.aperturaAt != null
      ? Math.max(1, Math.round((vehicle.cierreAt - vehicle.aperturaAt) / 60000))
      : closed.reduce(
          (a, s) => a + (s.duracionFinal != null ? Math.round(s.duracionFinal / 60) : 0),
          0
        );
  saveVehicleHistoryEntry(vehicle.titulo, 0, duracionFinal, "desglosador_ciclo", userId, {
    status: "cumplido",
    cumplidos,
    fallados,
    totalSubs: subs.length,
    subResumen: closed.map(sv => ({
      titulo: sv.titulo,
      status: sv.status as "cumplido" | "fallado",
      cantidadObjetivo: sv.cantidadObjetivo,
      cantidadLograda: sv.cantidadLograda,
      duracionMin:
        sv.duracionFinal != null ? Math.round(sv.duracionFinal / 60) : undefined,
    })),
  });
}
