/**
 * Triada de conciencia del operador — idle only, isla Métricas.
 *
 * Anti-freeze Dual Kernel:
 * - No tick 1s, no motor de conciencia, no pulso, no ms0.
 * - Firma O(n) numérica en render; suma del plan y localStorage solo en idle.
 * - Poll lento SOLO si hay vehículo consciente abierto.
 * - No escribe disco si el modelo no cambió.
 * - No corre con la pestaña oculta.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  accumulateActiveTriadaMinutos,
  buildConcienciaTriadaModel,
  buildTriadaInputSig,
  EMPTY_TRIADA_MODEL,
  getTriadaDayLedger,
  hasTriadaActiveVehicle,
  readTriadaSeriesLocal,
  resolveTriadaClosedMinutos,
  sumMinutosPlanDelDia,
  triadaModelEquals,
  upsertTriadaDaySnapshot,
  type ConcienciaTriadaModel,
  type TriadaDaySnapshot,
} from "@/lib/concienciaTriadaOperador";
import { getJournalDateString } from "@/lib/segmentTime";
import type { Vehicle } from "@/lib/persistence";

export type UseConcienciaTriadaOperadorParams = {
  userId: string | undefined;
  segmentos: { horaInicio?: string; horaFin?: string }[];
  vehicles: Vehicle[];
  enabled?: boolean;
};

/** rIC timeout / fallback — nunca clamp a 100–200 ms (robo de gesto). */
const TRIADA_IDLE_MS = 1_600;
const TRIADA_BOOT_MS = 400;

function scheduleIdle(run: () => void, timeoutMs: number): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(() => run(), { timeout: timeoutMs });
    return () => cancelIdleCallback(id);
  }
  const t = window.setTimeout(run, timeoutMs);
  return () => window.clearTimeout(t);
}

function triadaRefreshIntervalMs(): number {
  if (typeof window === "undefined") return 10_000;
  try {
    if (
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(max-width: 768px)").matches
    ) {
      return 15_000;
    }
  } catch {
    /* ignore */
  }
  return 10_000;
}

function isTabHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

export function useConcienciaTriadaOperador({
  userId,
  segmentos,
  vehicles,
  enabled = true,
}: UseConcienciaTriadaOperadorParams): {
  model: ConcienciaTriadaModel;
  series: TriadaDaySnapshot[];
} {
  const [model, setModel] = useState<ConcienciaTriadaModel>(EMPTY_TRIADA_MODEL);
  const [series, setSeries] = useState<TriadaDaySnapshot[]>([]);
  const genRef = useRef(0);
  const modelRef = useRef<ConcienciaTriadaModel>(EMPTY_TRIADA_MODEL);
  const latestRef = useRef({ userId, segmentos, vehicles, fecha: "" });
  const computeRef = useRef<() => void>(() => {});

  const fecha = useMemo(() => getJournalDateString(), []);
  latestRef.current = { userId, segmentos, vehicles, fecha };
  modelRef.current = model;

  const inputSig = useMemo(
    () => buildTriadaInputSig(segmentos, vehicles),
    [segmentos, vehicles]
  );

  computeRef.current = () => {
    const src = latestRef.current;
    const uid = src.userId;
    if (!uid) return;
    const minutosPlan = sumMinutosPlanDelDia(src.segmentos);
    const ledger = getTriadaDayLedger(uid, src.fecha);
    const closed = resolveTriadaClosedMinutos(ledger, src.vehicles, src.fecha);
    const active = accumulateActiveTriadaMinutos(src.vehicles);
    const next = buildConcienciaTriadaModel({
      fecha: src.fecha,
      minutosPlan,
      minutosPresenciaCerrados: closed.minutosPresencia,
      minutosDireccionCerrados: closed.minutosDireccion,
      minutosPresenciaActivos: active.minutosPresencia,
      minutosDireccionActivos: active.minutosDireccion,
    });
    if (triadaModelEquals(modelRef.current, next)) return;
    modelRef.current = next;
    setModel(next);
    if (next.hasPlanificacion && next.minutosPlan > 0) {
      setSeries(upsertTriadaDaySnapshot(uid, next));
    }
  };

  useEffect(() => {
    if (!enabled || !userId) {
      setModel(EMPTY_TRIADA_MODEL);
      setSeries([]);
      modelRef.current = EMPTY_TRIADA_MODEL;
      return;
    }
    let cancelled = false;
    const cancelIdle = scheduleIdle(() => {
      if (cancelled) return;
      setSeries(readTriadaSeriesLocal(userId));
    }, TRIADA_IDLE_MS);
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [userId, enabled]);

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    let cancelPending: (() => void) | null = null;

    const runIdle = () => {
      if (cancelled || isTabHidden()) return;
      const gen = ++genRef.current;
      cancelPending?.();
      cancelPending = scheduleIdle(() => {
        if (cancelled || gen !== genRef.current || isTabHidden()) return;
        computeRef.current();
      }, TRIADA_IDLE_MS);
    };

    const boot = window.setTimeout(runIdle, TRIADA_BOOT_MS);
    const intervalId = window.setInterval(() => {
      if (cancelled || isTabHidden()) return;
      if (!hasTriadaActiveVehicle(latestRef.current.vehicles)) return;
      runIdle();
    }, triadaRefreshIntervalMs());

    const onVisible = () => {
      if (document.visibilityState === "visible") runIdle();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      genRef.current += 1;
      window.clearTimeout(boot);
      cancelPending?.();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, enabled]);

  useEffect(() => {
    if (!enabled || !userId || isTabHidden()) return;
    let cancelled = false;
    const cancelIdle = scheduleIdle(() => {
      if (cancelled || isTabHidden()) return;
      computeRef.current();
    }, TRIADA_IDLE_MS);
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [inputSig, userId, enabled]);

  return { model, series };
}
