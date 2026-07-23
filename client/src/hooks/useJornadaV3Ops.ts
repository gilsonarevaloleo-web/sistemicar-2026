/**
 * Operaciones de ring/reserva/desglosador para Jornada V3.
 * Sin useDesglosadorManager: solo las lógicas que V3 necesita.
 * Recibe flota vía parámetros (useJornadaFlotaCore) en vez de gestionar el store.
 */
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  startTransition,
  type MutableRefObject,
} from "react";
import { toast } from "sonner";
import {
  updateVehicle,
  awardSovereigntyPoints,
  saveLocalVehicles,
  flushLocalVehicles,
  type Vehicle,
  type SubVehiculo,
  type SubTarea,
  type SegmentoV5,
} from "@/lib/persistence";
import { scheduleSaveLocalVehicles } from "@/lib/deferredVehicleSave";
import { paintSituacionRingRowCloseOptimistic } from "@/lib/situacionRingCloseMs0";
import {
  aplicarTiempoGanadoAlCumplir,
  registrarCierreFalladoCronometro,
  resolveCronometroCupoAnchor,
  redistribuirMinutosSituacionCronometro,
  remainingCronometroBudgetMin,
  isCupoFijo,
  situacionFilaCronometroPendiente,
  vehicleNeedsCupoAnchorSync,
  absorberSaldoAdelantoEnFoco,
} from "@/lib/situacionCupoDistrib";
import {
  addSituacionReserva,
  updateSituacionReservaEstado,
  updateSituacionReservaRuta,
  deleteSituacionReserva,
  getReservaActivas,
  RUTA_TACTICA_META,
  sortReservasTacticas,
  subscribeToSituacionReserva,
  type ReservaTacticaRuta,
  type SituacionReservaItem,
} from "@/lib/situacionReserva";
import {
  ringSessionOperable,
  reanudarSituacionCronometroRing,
  RING_COPY,
} from "@/lib/ringEnfoqueReal";
import {
  describeRepartoGananciaEnCola,
  situacionContratoFinMs,
  situacionObjetivoHoraToContratoMs,
  situacionMinutosHastaObjetivoHora,
  resolveDefaultObjetivoHoraParaRing,
  nextRetoNumero,
} from "@/lib/situacionGanancia";
import {
  subTareaFromImanItem,
  aplicarProyectoHeredadoASub,
  dominanteProyectoIdEnSubs,
  resolveProyectoIdEnfoqueSituacion,
  subTareaConPasoEjecutado,
  reservaEsEnviabeASituacion,
} from "@/lib/imanPensamientos";
import { runShadowTaskAsync, yieldAfterPaint } from "@/lib/desglosadorShadow";
import { scheduleDesglosadorDepthOnTap } from "@/services/desglosadorDepthShadow";
import { computeDesglosadorSessionDepthPS } from "@/lib/desglosadorDepth";
import {
  decisionKeySubSituacion,
  decisionKeySubDesglosador,
  recordDecision,
} from "@/lib/decisionesLedger";
import {
  playSituacionChimes,
  PIZARRA,
  BLOOD,
  EMERALD,
  VERDE,
  PLATA,
  CYAN,
} from "@/components/flota/vehicleCardShared";
import { speakRingBienvenida } from "@/lib/situacionAlerts";
import { unlockSpeechSynthesis } from "@/lib/speechQueue";
import { requestNotificationPermission } from "@/lib/notifications";
import { syncRingDecisionToProyectoHub } from "@/lib/syncRingDecisionToProyectoHub";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type UseJornadaV3OpsParams = {
  flota: {
    vehicles: Vehicle[];
    setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void;
    vehiclesRef: MutableRefObject<Vehicle[]>;
    expandedId: string | null;
    setExpandedId: (id: string | null) => void;
    safeAwardPS: (amount: number, source: string) => Promise<boolean>;
  };
  userId: string | undefined;
  segmentoActivo: SegmentoV5 | null;
  proyectosHub: Array<{ id: string; titulo: string; etiqueta?: string; color?: string }>;
};

// ────────────────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────────────────

export function useJornadaV3Ops(params: UseJornadaV3OpsParams): {
  situacionReserva: SituacionReservaItem[];
  handleReservaTacticaQuickAdd: (texto: string, ruta: ReservaTacticaRuta, proyectoId?: string) => Promise<void>;
  handleReservaRutaChange: (reservaId: string, ruta: ReservaTacticaRuta) => Promise<void>;
  handleEnviarReservaASituacion: (reservaId: string) => Promise<void>;
  handleToggleSubTarea: (vehicleId: string, subTareaId: string) => Promise<void>;
  handleSituacionCronometroCumplido: (vehicleId: string, subTareaId: string) => Promise<void>;
  handleSituacionCronometroFallado: (vehicleId: string, subTareaId: string) => Promise<void>;
  handleDesglosadorUpdate: (
    vehicleId: string,
    updatedSubs: SubVehiculo[],
    opts?: {
      resetDepth?: boolean;
      silentDepth?: boolean;
      force?: boolean;
      rutaCruzadoOnly?: boolean;
      launchPaint?: boolean;
    }
  ) => void;
} {
  const { flota, userId, segmentoActivo, proyectosHub } = params;
  const { vehicles, setVehicles, vehiclesRef, expandedId, setExpandedId, safeAwardPS } = flota;

  // ── State ────────────────────────────────────────────────────────────────
  const [situacionReserva, setSituacionReserva] = useState<SituacionReservaItem[]>([]);

  // ── Internal refs ────────────────────────────────────────────────────────
  const desglosadorSyncTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const ringSellarInFlightRef = useRef(new Set<string>());

  // ── Derived ──────────────────────────────────────────────────────────────
  const reservaActivas = useMemo(() => getReservaActivas(situacionReserva), [situacionReserva]);

  // ── Subscribe to reserva ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToSituacionReserva(userId, setSituacionReserva, e => console.error(e));
    return () => unsub();
  }, [userId]);

  // ── Persist helpers ──────────────────────────────────────────────────────
  const persistVehiclesRef = useCallback(() => {
    scheduleSaveLocalVehicles(vehiclesRef.current);
  }, [vehiclesRef]);

  const flushPersistVehiclesRef = useCallback(() => {
    flushLocalVehicles(vehiclesRef.current);
  }, [vehiclesRef]);

  // ── Vehicle lookup ───────────────────────────────────────────────────────
  const vehicleById = useCallback(
    (vehicleId: string) =>
      vehiclesRef.current.find(v => v.id === vehicleId) ?? vehicles.find(v => v.id === vehicleId),
    [vehiclesRef, vehicles]
  );

  // ── Desglosador progress score (used in handleDesglosadorUpdate) ─────────
  const desglosadorProgressScore = (subs: SubVehiculo[] | undefined): number =>
    (subs ?? []).reduce((acc, s) => {
      if (s.status === "cumplido" || s.status === "fallado") return acc + 100;
      if (s.status === "activo") return acc + 10;
      return acc;
    }, 0);

  // ── handleDesglosadorUpdate ──────────────────────────────────────────────
  const handleDesglosadorUpdate = useCallback(
    (
      vehicleId: string,
      updatedSubs: SubVehiculo[],
      opts?: {
        resetDepth?: boolean;
        silentDepth?: boolean;
        force?: boolean;
        rutaCruzadoOnly?: boolean;
        launchPaint?: boolean;
      }
    ) => {
      if (!userId) return;
      const prevVehicle = vehiclesRef.current.find(v => v.id === vehicleId);
      if (!prevVehicle) return;
      if (prevVehicle.status !== "activo") {
        console.warn("[Desglosador] Ignorando actualización: vehículo ya cerrado", vehicleId);
        return;
      }

      const prevActiveId = prevVehicle.subVehiculos?.find(s => s.status === "activo")?.id;
      const nextActiveId = updatedSubs.find(s => s.status === "activo")?.id;
      const prevProgress = desglosadorProgressScore(prevVehicle.subVehiculos);
      const nextProgress = desglosadorProgressScore(updatedSubs);
      if (!opts?.force && nextProgress < prevProgress) {
        console.warn("[Desglosador] Ignorando actualización obsoleta de subs", vehicleId);
        return;
      }
      for (const sub of updatedSubs) {
        if (sub.status !== "cumplido") continue;
        const prevSub = prevVehicle.subVehiculos?.find(s => s.id === sub.id);
        if (prevSub?.status === "cumplido") continue;
        recordDecision(userId, {
          key: decisionKeySubDesglosador(vehicleId, sub.id),
          kind: "sub_desglosador",
          vehicleId,
        });
      }

      const depthGranted = opts?.resetDepth ? 0 : (prevVehicle.desglosadorBloqueDepthPsGranted ?? 0);
      const newVehicles = vehiclesRef.current.map(v => {
        if (v.id !== vehicleId) return v;
        const patch: Partial<Vehicle> = { subVehiculos: updatedSubs, desglosadorBloqueDepthPsGranted: depthGranted };
        if (opts?.resetDepth) patch.aperturaAt = Date.now();
        return { ...v, ...patch };
      });

      // Urgent when active sub changes or force; non-urgent for launchPaint / cruces.
      const activeSubChanged = prevActiveId !== nextActiveId;
      if ((activeSubChanged || opts?.force) && !opts?.launchPaint) {
        setVehicles(newVehicles);
      } else {
        startTransition(() => {
          setVehicles(newVehicles);
        });
      }
      vehiclesRef.current = newVehicles;
      scheduleSaveLocalVehicles(newVehicles);

      const prevTimer = desglosadorSyncTimersRef.current.get(vehicleId);
      if (prevTimer) clearTimeout(prevTimer);
      const firebaseDelayMs = opts?.launchPaint ? 2200 : 450;
      desglosadorSyncTimersRef.current.set(
        vehicleId,
        setTimeout(() => {
          desglosadorSyncTimersRef.current.delete(vehicleId);
          const latest = vehiclesRef.current.find(v => v.id === vehicleId);
          if (!latest?.subVehiculos?.length || latest.status !== "activo") return;
          void updateVehicle(userId, vehicleId, {
            subVehiculos: latest.subVehiculos,
            desglosadorBloqueDepthPsGranted: latest.desglosadorBloqueDepthPsGranted,
          }).catch(e => console.warn("[Desglosador] sync Firebase subs:", e));
        }, firebaseDelayMs)
      );

      if (opts?.resetDepth) {
        scheduleDesglosadorDepthOnTap(vehicleId, { silent: true, resetGranted: 0 });
      } else {
        scheduleDesglosadorDepthOnTap(vehicleId, { silent: opts?.silentDepth ?? true });
      }
    },
    [userId, vehiclesRef, setVehicles, persistVehiclesRef]
  );

  // ── handleSyncSituacionCupoAnchor (internal helper) ──────────────────────
  const handleSyncSituacionCupoAnchor = useCallback(
    async (vehicleId: string, opts?: { forceResetSameRow?: boolean }) => {
      if (!userId) return;
      const v = vehiclesRef.current.find(x => x.id === vehicleId);
      if (!v || v.tipoFlota !== "situacion" || v.status !== "activo") return;
      const list = v.subTareas || [];
      const cronActivo = v.situacionCronometro?.activo === true;
      const cur = v.situacionCupoAnchor;

      let next: { subTareaId: string; startedAt: number } | null | undefined;
      if (cronActivo) {
        const resolved = resolveCronometroCupoAnchor(list, cur, opts);
        if (resolved === "unchanged") return;
        next = resolved;
      } else {
        const first = list.find(st => {
          if (!((st.minutosCupo ?? 0) > 0)) return false;
          return !st.enDesgloseCronometro && !st.completada;
        });
        if (!first) {
          next = null;
        } else if (cur?.subTareaId === first.id && !opts?.forceResetSameRow) {
          return;
        } else {
          next = { subTareaId: first.id, startedAt: Date.now() };
        }
      }

      if (next === undefined) return;
      if (next === null) {
        if (cur != null) {
          vehiclesRef.current = vehiclesRef.current.map(x =>
            x.id === vehicleId ? { ...x, situacionCupoAnchor: undefined } : x
          );
          persistVehiclesRef();
          startTransition(() => {
            setVehicles(prev => prev.map(x => (x.id === vehicleId ? { ...x, situacionCupoAnchor: undefined } : x)));
          });
          void updateVehicle(userId, vehicleId, { situacionCupoAnchor: null }).catch(err => {
            console.error("[handleSyncSituacionCupoAnchor] clear", err);
          });
        }
        return;
      }

      vehiclesRef.current = vehiclesRef.current.map(x =>
        x.id === vehicleId ? { ...x, situacionCupoAnchor: next } : x
      );
      persistVehiclesRef();
      startTransition(() => {
        setVehicles(prev => prev.map(x => (x.id === vehicleId ? { ...x, situacionCupoAnchor: next } : x)));
      });
      void updateVehicle(userId, vehicleId, { situacionCupoAnchor: next }).catch(err => {
        console.error("[handleSyncSituacionCupoAnchor] set", err);
      });
    },
    [userId, vehiclesRef, setVehicles, persistVehiclesRef]
  );

  // ── handleEnqueueSubTareasToCronometro (internal helper) ─────────────────
  const handleEnqueueSubTareasToCronometro = useCallback(
    async (
      vehicleId: string,
      ids: string[],
      opts?: { proyectoEnfoqueId?: string }
    ): Promise<boolean> => {
      if (!userId || ids.length === 0) return false;
      if (ringSellarInFlightRef.current.has(vehicleId)) return false;
      ringSellarInFlightRef.current.add(vehicleId);
      try {
        const vehicle =
          vehiclesRef.current.find(v => v.id === vehicleId) ??
          vehicles.find(v => v.id === vehicleId);
        if (!vehicle?.subTareas || vehicle.tipoFlota !== "situacion") return false;
        const sc = vehicle.situacionCronometro;
        if (sc?.activo !== true) return false;

        const idSet = new Set(ids);
        const invalid = ids.some(id => {
          const st = vehicle.subTareas!.find(s => s.id === id);
          return !st || st.enDesgloseCronometro || st.completada;
        });
        if (invalid) {
          toast.error("No se puede encolar", {
            description: "Solo subtareas libres (no completadas) pueden entrar a la cola del reto.",
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
            duration: 3200,
          });
          return false;
        }

        const segProy = segmentoActivo?.proyectoVinculadoId;
        const enfoqueHeredado =
          opts?.proyectoEnfoqueId?.trim() ||
          sc.proyectoEnfoqueId?.trim() ||
          resolveProyectoIdEnfoqueSituacion(vehicle, segProy);

        const lifted = vehicle.subTareas
          .filter(st => idSet.has(st.id))
          .map(st => {
            const next: SubTarea = {
              ...st,
              enDesgloseCronometro: true,
              resultadoSituacion: "pendiente" as const,
              completada: false,
            };
            if (!isCupoFijo(st)) {
              delete (next as { minutosCupo?: number }).minutosCupo;
              delete (next as { cupoFijo?: boolean }).cupoFijo;
            }
            return aplicarProyectoHeredadoASub(next, enfoqueHeredado);
          });
        const libreOrdered = vehicle.subTareas.filter(st => !idSet.has(st.id));
        let subTareas = [...libreOrdered, ...lifted];
        const budgetMin = remainingCronometroBudgetMin(sc, subTareas);
        if (budgetMin == null) {
          toast.error("Meta del reto no disponible", {
            description: "No hay tiempo sellado para repartir entre la cola.",
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
            duration: 3200,
          });
          return false;
        }

        subTareas = redistribuirMinutosSituacionCronometro(subTareas, budgetMin);

        const contratoMs = situacionContratoFinMs(sc);
        const proyectoEnfoqueId =
          opts?.proyectoEnfoqueId?.trim() ||
          sc.proyectoEnfoqueId?.trim() ||
          dominanteProyectoIdEnSubs(subTareas.filter(st => st.enDesgloseCronometro)) ||
          vehicle.proyectoId?.trim() ||
          segProy?.trim();
        const situacionCronometro = {
          ...sc,
          ...(proyectoEnfoqueId && !sc.proyectoEnfoqueId?.trim() ? { proyectoEnfoqueId } : {}),
        };
        let situacionCupoAnchor = vehicle.situacionCupoAnchor ?? undefined;
        const curAnchor = vehicle.situacionCupoAnchor;
        const curSub = curAnchor ? subTareas.find(s => s.id === curAnchor.subTareaId) : undefined;
        const anchorStillValid =
          !!curSub &&
          situacionFilaCronometroPendiente(curSub) &&
          (curSub.minutosCupo ?? 0) > 0;
        if (!anchorStillValid) {
          const firstCron = subTareas.find(
            st => situacionFilaCronometroPendiente(st) && (st.minutosCupo ?? 0) > 0
          );
          if (firstCron) {
            situacionCupoAnchor = { subTareaId: firstCron.id, startedAt: Date.now() };
          }
        }

        vehiclesRef.current = vehiclesRef.current.map(v =>
          v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
        );
        flushPersistVehiclesRef();
        startTransition(() => {
          setVehicles(prev =>
            prev.map(v =>
              v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
            )
          );
        });
        setExpandedId(vehicleId);
        void updateVehicle(userId, vehicleId, {
          subTareas,
          situacionCronometro,
          situacionCupoAnchor: situacionCupoAnchor ?? null,
        })
          .then(() => {
            if (!anchorStillValid && !situacionCupoAnchor) {
              void handleSyncSituacionCupoAnchor(vehicleId);
            }
          })
          .catch(e => console.error("[handleEnqueueSubTareasToCronometro]", e));
        const metaLabel =
          contratoMs != null
            ? new Date(contratoMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "—";
        toast.success("Añadido a la cola", {
          description: `${lifted.length} fila(s) · meta ${metaLabel} · ${budgetMin} min repartidos`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${VERDE}`, color: VERDE },
          duration: 3200,
        });
        return true;
      } finally {
        queueMicrotask(() => ringSellarInFlightRef.current.delete(vehicleId));
      }
    },
    [
      userId,
      vehiclesRef,
      vehicles,
      segmentoActivo,
      setVehicles,
      setExpandedId,
      flushPersistVehiclesRef,
      handleSyncSituacionCupoAnchor,
    ]
  );

  // ── handleMoveSubTareasToCronometro (internal helper) ────────────────────
  const handleMoveSubTareasToCronometro = useCallback(
    async (
      vehicleId: string,
      ids: string[],
      opts?: { objetivoHora?: string; proyectoEnfoqueId?: string }
    ): Promise<boolean> => {
      if (!userId || ids.length === 0) return false;
      const vehicle =
        vehiclesRef.current.find(v => v.id === vehicleId) ??
        vehicles.find(v => v.id === vehicleId);
      if (!vehicle?.subTareas || vehicle.tipoFlota !== "situacion") return false;
      if (vehicle.situacionCronometro?.activo === true) {
        return handleEnqueueSubTareasToCronometro(vehicleId, ids, opts);
      }
      const idSet = new Set(ids);
      const segProy = segmentoActivo?.proyectoVinculadoId;
      const enfoqueHeredado =
        opts?.proyectoEnfoqueId?.trim() ||
        resolveProyectoIdEnfoqueSituacion(vehicle, segProy);
      const libreOrdered = vehicle.subTareas.filter(st => !idSet.has(st.id));
      const lifted = vehicle.subTareas.filter(st => idSet.has(st.id)).map(st => {
        const next: SubTarea = {
          ...st,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente" as const,
        };
        if (!isCupoFijo(st)) {
          delete (next as { minutosCupo?: number }).minutosCupo;
          delete (next as { cupoFijo?: boolean }).cupoFijo;
        }
        return aplicarProyectoHeredadoASub(next, enfoqueHeredado);
      });
      let subTareas = [...libreOrdered, ...lifted];
      const prevSc = vehicle.situacionCronometro;
      const objetivoHora =
        opts?.objetivoHora?.trim() ||
        resolveDefaultObjetivoHoraParaRing(segmentoActivo?.horaFin) ||
        "";
      const contratoMs = situacionObjetivoHoraToContratoMs(objetivoHora);
      const sum = contratoMs != null ? situacionMinutosHastaObjetivoHora(objetivoHora) : null;
      if (sum == null || contratoMs == null) {
        toast.error("Tiempo objetivo inválido", {
          description: "Indica una hora futura (ej. fin de segmento) para abrir el ring de enfoque.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          duration: 3200,
        });
        return false;
      }
      subTareas = redistribuirMinutosSituacionCronometro(subTareas, sum);
      const firstActivation = true;
      const bloqueInicioAt = Date.now();
      const retoNumero = nextRetoNumero(prevSc);
      const proyectoEnfoqueId =
        opts?.proyectoEnfoqueId?.trim() ||
        dominanteProyectoIdEnSubs(lifted) ||
        vehicle.proyectoId?.trim() ||
        segProy?.trim();
      const situacionCronometro = {
        activo: true,
        bloqueInicioAt,
        horaFinMs: contratoMs,
        horaFinContratoMs: contratoMs,
        depthBlockPsGranted: 0,
        retoNumero,
        retosCompletados: prevSc?.retosCompletados ?? 0,
        minutosGanadosReto: 0,
        minutosGanadosSesion: prevSc?.minutosGanadosSesion ?? 0,
        saldoAdelantoMin: 0,
        bolsaSegundoRetoMin: undefined,
        ...(proyectoEnfoqueId ? { proyectoEnfoqueId } : {}),
      };
      const firstCron = subTareas.find(
        st => situacionFilaCronometroPendiente(st) && (st.minutosCupo ?? 0) > 0
      );
      let situacionCupoAnchor = vehicle.situacionCupoAnchor ?? undefined;
      if (firstCron) {
        const curAnchor = vehicle.situacionCupoAnchor;
        const curSub = curAnchor ? subTareas.find(s => s.id === curAnchor.subTareaId) : undefined;
        const anchorStillValid =
          !!curSub &&
          situacionFilaCronometroPendiente(curSub) &&
          (curSub.minutosCupo ?? 0) > 0;
        if (firstActivation || !anchorStillValid) {
          situacionCupoAnchor = {
            subTareaId: firstCron.id,
            startedAt: firstActivation ? bloqueInicioAt : Date.now(),
          };
        }
      }
      setVehicles(prev =>
        prev.map(v =>
          v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
        )
      );
      vehiclesRef.current = vehiclesRef.current.map(v =>
        v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
      );
      persistVehiclesRef();
      setExpandedId(vehicleId);
      // Bienvenida en el gesto (antes de Firebase) — igual que useDesglosadorManager.
      if (firstActivation) {
        void requestNotificationPermission();
        unlockSpeechSynthesis(true);
        queueMicrotask(() =>
          speakRingBienvenida(retoNumero, `ring-bienvenida-${vehicleId}-${bloqueInicioAt}`)
        );
      }
      try {
        await updateVehicle(userId, vehicleId, {
          subTareas,
          situacionCronometro,
          situacionCupoAnchor: situacionCupoAnchor ?? null,
        });
        toast.success(retoNumero > 1 ? RING_COPY.siguienteRonda : RING_COPY.ring, {
          description: `${lifted.length} subtarea(s) · meta ${objetivoHora} (${sum} min repartidos)`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
          duration: 2800,
        });
        return true;
      } catch (e) {
        console.error("[handleMoveSubTareasToCronometro]", e);
        return false;
      }
    },
    [
      userId,
      vehiclesRef,
      vehicles,
      segmentoActivo,
      setVehicles,
      setExpandedId,
      persistVehiclesRef,
      handleEnqueueSubTareasToCronometro,
    ]
  );

  // ── pickSituacionVehicleTarget (internal helper) ──────────────────────────
  const pickSituacionVehicleTarget = useCallback((): Vehicle | undefined => {
    const activos = vehicles.filter(v => v.status === "activo" && v.tipoFlota === "situacion");
    if (activos.length === 0) return undefined;
    if (expandedId) {
      const ex = activos.find(v => v.id === expandedId);
      if (ex) return ex;
    }
    if (activos.length === 1) return activos[0];
    return undefined;
  }, [vehicles, expandedId]);

  // ── handleReservaAListaLibre (internal helper) ────────────────────────────
  const handleReservaAListaLibre = useCallback(
    async (reservaId: string) => {
      if (!userId) return;
      const item = reservaActivas.find(r => r.id === reservaId);
      if (!item) return;
      const activos = vehicles.filter(v => v.status === "activo" && v.tipoFlota === "situacion");
      const vehicle = pickSituacionVehicleTarget();
      if (!vehicle) {
        toast.error(
          activos.length > 1
            ? "Expande el vehículo de enfoque destino"
            : "Abre un vehículo de enfoque activo",
          { style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD } }
        );
        return;
      }
      const newSub = subTareaFromImanItem(item);
      const subTareas = [...(vehicle.subTareas || []), newSub];
      setVehicles(prev => prev.map(v => (v.id === vehicle.id ? { ...v, subTareas } : v)));
      vehiclesRef.current = vehiclesRef.current.map(v =>
        v.id === vehicle.id ? { ...v, subTareas } : v
      );
      persistVehiclesRef();
      try {
        void updateVehicle(userId, vehicle.id, { subTareas });
        const localSaved = await updateSituacionReservaEstado(userId, reservaId, "retomada_libre", {
          retomadaAt: Date.now(),
          retomadaEnVehiculoId: vehicle.id,
        });
        if (!localSaved) {
          toast.error("No se pudo actualizar la reserva", {
            description: "Libera espacio en el navegador e inténtalo de nuevo.",
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          });
          return;
        }
        setSituacionReserva(prev =>
          prev.map(i =>
            i.id === reservaId
              ? {
                  ...i,
                  estado: "retomada_libre" as const,
                  retomadaAt: Date.now(),
                  retomadaEnVehiculoId: vehicle.id,
                }
              : i
          )
        );
        setExpandedId(vehicle.id);
        void handleSyncSituacionCupoAnchor(vehicle.id);
        toast.success("Retomada en lista libre", {
          description: `"${item.texto}" · marcada cumplida en reserva`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
          duration: 2800,
        });
      } catch (e) {
        console.error("[handleReservaAListaLibre]", e);
        toast.error("No se pudo retomar en lista libre", {
          description: "Comprueba que el vehículo de enfoque siga activo e inténtalo de nuevo.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
      }
    },
    [
      userId,
      reservaActivas,
      vehicles,
      vehiclesRef,
      setVehicles,
      setExpandedId,
      persistVehiclesRef,
      pickSituacionVehicleTarget,
      handleSyncSituacionCupoAnchor,
    ]
  );

  // ── handleReservaACronometro (internal helper) ────────────────────────────
  const handleReservaACronometro = useCallback(
    async (reservaId: string) => {
      if (!userId) return;
      const item = reservaActivas.find(r => r.id === reservaId);
      if (!item) return;
      const activos = vehicles.filter(v => v.status === "activo" && v.tipoFlota === "situacion");
      const vehicle =
        (item.origenVehiculoId ? activos.find(v => v.id === item.origenVehiculoId) : undefined) ??
        pickSituacionVehicleTarget();
      if (!vehicle) {
        toast.error(
          activos.length > 1
            ? "Expande el vehículo de enfoque destino"
            : "Abre un vehículo de enfoque activo",
          { style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD } }
        );
        return;
      }
      const newSub = subTareaFromImanItem(item);
      const prevSubTareas = vehicle.subTareas || [];
      const subTareas = [...prevSubTareas, newSub];
      vehiclesRef.current = vehiclesRef.current.map(v =>
        v.id === vehicle.id ? { ...v, subTareas } : v
      );
      setVehicles(prev => prev.map(v => (v.id === vehicle.id ? { ...v, subTareas } : v)));
      try {
        const moved = await handleMoveSubTareasToCronometro(vehicle.id, [newSub.id], {
          proyectoEnfoqueId: item.proyectoId,
        });
        if (!moved) {
          vehiclesRef.current = vehiclesRef.current.map(v =>
            v.id === vehicle.id ? { ...v, subTareas: prevSubTareas } : v
          );
          setVehicles(prev =>
            prev.map(v => (v.id === vehicle.id ? { ...v, subTareas: prevSubTareas } : v))
          );
          persistVehiclesRef();
          return;
        }
        const localSaved = await updateSituacionReservaEstado(userId, reservaId, "retomada_cron", {
          retomadaAt: Date.now(),
          retomadaEnVehiculoId: vehicle.id,
        });
        if (!localSaved) {
          toast.error("No se pudo actualizar la reserva", {
            description: "Libera espacio en el navegador e inténtalo de nuevo.",
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          });
          return;
        }
        setSituacionReserva(prev =>
          prev.map(i =>
            i.id === reservaId
              ? {
                  ...i,
                  estado: "retomada_cron" as const,
                  retomadaAt: Date.now(),
                  retomadaEnVehiculoId: vehicle.id,
                }
              : i
          )
        );
        setExpandedId(vehicle.id);
        toast.success("Retomada en desglose con tiempo", {
          description: item.texto,
          style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
          duration: 2800,
        });
      } catch (e) {
        console.error("[handleReservaACronometro]", e);
        vehiclesRef.current = vehiclesRef.current.map(v =>
          v.id === vehicle.id ? { ...v, subTareas: prevSubTareas } : v
        );
        setVehicles(prev =>
          prev.map(v => (v.id === vehicle.id ? { ...v, subTareas: prevSubTareas } : v))
        );
        persistVehiclesRef();
        toast.error("No se pudo retomar en cronómetro", {
          description: "Comprueba que el vehículo de enfoque siga activo e inténtalo de nuevo.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
      }
    },
    [
      userId,
      reservaActivas,
      vehicles,
      vehiclesRef,
      setVehicles,
      setExpandedId,
      persistVehiclesRef,
      pickSituacionVehicleTarget,
      handleMoveSubTareasToCronometro,
    ]
  );

  // ── handleToggleSubTarea ─────────────────────────────────────────────────
  const handleToggleSubTarea = useCallback(
    async (vehicleId: string, subTareaId: string) => {
      if (!userId) return;
      const vehicle = vehicleById(vehicleId);
      if (!vehicle) return;
      const targetSub = (vehicle.subTareas || []).find(st => st.id === subTareaId);
      if (targetSub?.enDesgloseCronometro) return;
      const isChecking = targetSub ? !targetSub.completada : false;
      const list = vehicle.subTareas || [];
      const idx = list.findIndex(st => st.id === subTareaId);
      const chimesOnComplete =
        isChecking && vehicle.tipoFlota === "situacion" && idx >= 0
          ? Math.max(1, list.length - idx)
          : 0;
      const nowMs = Date.now();
      let subTareas = list.map(st =>
        st.id === subTareaId
          ? { ...st, completada: !st.completada, cerradaAt: isChecking ? nowMs : undefined }
          : st
      );
      let pasoNumero: number | null = null;
      if (isChecking && vehicle.tipoFlota === "situacion" && targetSub) {
        const updatedSub = subTareas.find(st => st.id === subTareaId)!;
        const sync = await syncRingDecisionToProyectoHub(userId, vehicle, updatedSub, "cumplido", nowMs);
        pasoNumero = sync.pasoNumero;
        if (pasoNumero != null) {
          subTareas = subTareaConPasoEjecutado(subTareas, subTareaId, pasoNumero);
        }
      }
      setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, subTareas } : v)));
      vehiclesRef.current = vehiclesRef.current.map(v =>
        v.id === vehicleId ? { ...v, subTareas } : v
      );
      persistVehiclesRef();
      try {
        await updateVehicle(userId, vehicleId, { subTareas });
        const live = vehiclesRef.current.find(v => v.id === vehicleId);
        if (live && vehicleNeedsCupoAnchorSync(live)) {
          queueMicrotask(() => { void handleSyncSituacionCupoAnchor(vehicleId); });
        }
        if (chimesOnComplete > 0) void playSituacionChimes(chimesOnComplete);
        if (isChecking && vehicle.tipoFlota === "situacion" && targetSub) {
          recordDecision(userId, {
            key: decisionKeySubSituacion(vehicleId, subTareaId),
            kind: "sub_situacion",
            vehicleId,
            ts: nowMs,
          });
          try {
            await awardSovereigntyPoints(userId, 2, `Sub-tarea (lista libre): ${targetSub.texto}`);
            toast.success("+2 PS · Cerrar sin reloj", {
              style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
              duration: 2000,
            });
          } catch {
            console.error("[handleToggleSubTarea] awardSovereigntyPoints falló");
          }
        }
      } catch (e) {
        console.error("[handleToggleSubTarea]", e);
      }
    },
    [
      userId,
      vehicleById,
      vehiclesRef,
      setVehicles,
      persistVehiclesRef,
      handleSyncSituacionCupoAnchor,
    ]
  );

  // ── handleSituacionCronometroCumplido ────────────────────────────────────
  const handleSituacionCronometroCumplido = useCallback(
    async (vehicleId: string, subTareaId: string) => {
      if (!userId) return;
      const vehicle = vehicleById(vehicleId);
      if (
        !vehicle?.subTareas ||
        vehicle.tipoFlota !== "situacion" ||
        !ringSessionOperable(vehicle.situacionCronometro, vehicle.subTareas)
      )
        return;
      const list = vehicle.subTareas;
      const targetSub = list.find(st => st.id === subTareaId);
      if (!targetSub?.enDesgloseCronometro || (targetSub.resultadoSituacion ?? "pendiente") !== "pendiente")
        return;

      // ms0: pinta cierre + ancla nueva ANTES de cualquier await (reinicio de reloj).
      paintSituacionRingRowCloseOptimistic(vehiclesRef, setVehicles, vehicleId, subTareaId, "cumplido");
      const painted = vehiclesRef.current.find(v => v.id === vehicleId) ?? vehicle;
      const subTareasPainted = painted.subTareas ?? list;
      const anchorPainted = painted.situacionCupoAnchor ?? null;

      const listCronOrder = list.filter(st => st.enDesgloseCronometro);
      const idx = listCronOrder.findIndex(st => st.id === subTareaId);
      const chimesOnComplete = idx >= 0 ? Math.max(1, listCronOrder.length - idx) : 1;
      // Chime in gesture (don't wait for Firebase) — ms0 feedback.
      void playSituacionChimes(chimesOnComplete);
      await yieldAfterPaint();

      const now = Date.now();
      let sc = vehicle.situacionCronometro!;
      if (!sc.horaFinContratoMs && sc.horaFinMs) {
        sc = { ...sc, horaFinContratoMs: sc.horaFinMs };
      }
      const bloqueInicio = sc.bloqueInicioAt ?? vehicle.aperturaAt ?? now;

      let workingList = list;
      if ((sc.saldoAdelantoMin ?? 0) > 0) {
        const absorbed = absorberSaldoAdelantoEnFoco(
          workingList,
          sc.saldoAdelantoMin!,
          vehicle.situacionCupoAnchor
        );
        workingList = absorbed.subTareas;
        sc = { ...sc, saldoAdelantoMin: absorbed.saldoRestante };
      }
      const gained = aplicarTiempoGanadoAlCumplir(
        workingList,
        subTareaId,
        vehicle.situacionCupoAnchor,
        now,
        bloqueInicio,
        sc.horaFinContratoMs ?? sc.horaFinMs
      );
      // Prefer rows already painted (result + cupos) to not overwrite the ms0 anchor.
      const subTareas = subTareasPainted.map(st => {
        const g = gained.subTareas.find(x => x.id === st.id);
        if (!g) return st;
        return {
          ...st,
          minutosCupo: g.minutosCupo ?? st.minutosCupo,
        };
      });
      const minutosGanados = gained.minutosGanados;
      const saldoAdelantoMin = gained.saldoAdelantoMin;
      const repartoColaDesc = describeRepartoGananciaEnCola(workingList, gained.subTareas, subTareaId);
      const elapsedSec = Math.floor((now - bloqueInicio) / 1000);
      const totalDepthPs = computeDesglosadorSessionDepthPS(elapsedSec);
      const prevGranted = sc.depthBlockPsGranted ?? 0;
      const deltaDepth = totalDepthPs - prevGranted;
      const bloqueListo = !subTareas.some(situacionFilaCronometroPendiente);
      const scActivo = {
        ...sc,
        depthBlockPsGranted: totalDepthPs,
        saldoAdelantoMin: (sc.saldoAdelantoMin ?? 0) + saldoAdelantoMin,
        minutosGanadosReto: (sc.minutosGanadosReto ?? 0) + minutosGanados,
        minutosGanadosSesion: (sc.minutosGanadosSesion ?? 0) + minutosGanados,
        retoNumero: sc.retoNumero ?? 1,
        retosCompletados: sc.retosCompletados ?? 0,
      };
      let situacionCronometro =
        !bloqueListo && scActivo.activo !== true
          ? reanudarSituacionCronometroRing(scActivo)
          : scActivo;
      // Use the painted anchor (fresh startedAt). Only re-resolve if missing.
      const anchorFresh =
        vehiclesRef.current.find(v => v.id === vehicleId)?.situacionCupoAnchor ?? anchorPainted;
      let situacionCupoAnchor = bloqueListo ? null : anchorFresh;
      if (!bloqueListo && !situacionCupoAnchor?.subTareaId) {
        const resolvedAnchor = resolveCronometroCupoAnchor(subTareas, vehicle.situacionCupoAnchor, {
          forceResetSameRow: true,
          now,
        });
        situacionCupoAnchor =
          resolvedAnchor === "unchanged" ? vehicle.situacionCupoAnchor ?? null : resolvedAnchor;
      }
      setVehicles(prev =>
        prev.map(v =>
          v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
        )
      );
      vehiclesRef.current = vehiclesRef.current.map(v =>
        v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
      );
      scheduleSaveLocalVehicles(vehiclesRef.current);
      recordDecision(userId, {
        key: decisionKeySubSituacion(vehicleId, subTareaId),
        kind: "sub_situacion",
        vehicleId,
        ts: now,
      });
      // burst already fired in paintSituacionRingRowCloseOptimistic

      void runShadowTaskAsync(async () => {
        let finalSubTareas = subTareas;
        let pasoNumero: number | null = null;
        const updatedSub = subTareas.find(st => st.id === subTareaId);
        if (updatedSub) {
          const sync = await syncRingDecisionToProyectoHub(userId, vehicle, updatedSub, "cumplido", now);
          pasoNumero = sync.pasoNumero;
          if (pasoNumero != null) {
            finalSubTareas = subTareaConPasoEjecutado(finalSubTareas, subTareaId, pasoNumero);
            setVehicles(prev =>
              prev.map(v =>
                v.id === vehicleId
                  ? { ...v, subTareas: finalSubTareas, situacionCronometro, situacionCupoAnchor }
                  : v
              )
            );
            vehiclesRef.current = vehiclesRef.current.map(v =>
              v.id === vehicleId
                ? { ...v, subTareas: finalSubTareas, situacionCronometro, situacionCupoAnchor }
                : v
            );
            scheduleSaveLocalVehicles(vehiclesRef.current);
          }
        }
        try {
          await updateVehicle(userId, vehicleId, {
            subTareas: finalSubTareas,
            situacionCronometro,
            situacionCupoAnchor,
          });
          await safeAwardPS(4, `Sub-tarea (cronómetro): ${targetSub.texto}`);
          if (deltaDepth > 0)
            await safeAwardPS(deltaDepth, `Profundidad bloque situación: ${vehicle.titulo}`);
          if (bloqueListo) {
            toast.success("+4 PS · Ronda completada", {
              description: `Todas las filas del ring están cerradas. Usa «${RING_COPY.cerrarRing}» cuando quieras sellar la ronda.`,
              style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
              duration: 5000,
            });
          } else if (deltaDepth > 0) {
            toast.success(`+4 PS · +${deltaDepth} PS profundidad (bloque)`, {
              style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
              duration: 2800,
            });
          } else if (minutosGanados > 0) {
            toast.success(`+4 PS · +${minutosGanados} min ganados`, {
              description:
                repartoColaDesc ?? "Tiempo sumado al cupo de la cola o de la fila en foco",
              style: { backgroundColor: PIZARRA, border: `1px solid ${VERDE}`, color: VERDE },
              duration: 3400,
            });
          } else {
            toast.success("+4 PS · Cumplido (cronómetro)", {
              style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
              duration: 2200,
            });
          }
          if (pasoNumero != null) {
            const proyTitulo = proyectosHub.find(p => p.id === targetSub.proyectoId)?.titulo;
            toast.info(`Paso #${pasoNumero} en ${proyTitulo ?? "proyecto"}`, {
              description: "Paso desde el Crisol — fe incremental, anti-miopía.",
              style: { backgroundColor: PIZARRA, border: `1px solid ${CYAN}`, color: CYAN },
              duration: 3500,
            });
          }
        } catch (e) {
          console.error("[handleSituacionCronometroCumplido]", e);
        }
      });
    },
    [
      userId,
      vehicleById,
      vehiclesRef,
      setVehicles,
      safeAwardPS,
      proyectosHub,
    ]
  );

  // ── handleSituacionCronometroFallado ─────────────────────────────────────
  const handleSituacionCronometroFallado = useCallback(
    async (vehicleId: string, subTareaId: string) => {
      if (!userId) return;
      const vehicle = vehicleById(vehicleId);
      if (
        !vehicle?.subTareas ||
        vehicle.tipoFlota !== "situacion" ||
        !ringSessionOperable(vehicle.situacionCronometro, vehicle.subTareas)
      )
        return;
      const targetSub = vehicle.subTareas.find(st => st.id === subTareaId);
      if (!targetSub?.enDesgloseCronometro || (targetSub.resultadoSituacion ?? "pendiente") !== "pendiente")
        return;

      // ms0: paint close + preserve painted anchor.
      paintSituacionRingRowCloseOptimistic(vehiclesRef, setVehicles, vehicleId, subTareaId, "fallado");
      const painted = vehiclesRef.current.find(v => v.id === vehicleId) ?? vehicle;
      await yieldAfterPaint();
      const now = Date.now();
      const sc = vehicle.situacionCronometro!;
      const bloqueInicio = sc.bloqueInicioAt ?? vehicle.aperturaAt ?? now;
      const subTareasRaw = registrarCierreFalladoCronometro(
        vehicle.subTareas,
        subTareaId,
        vehicle.situacionCupoAnchor,
        now,
        bloqueInicio
      );
      // Preserve ms0 anchor; only merge cupos from calculation.
      const subTareasPainted =
        vehiclesRef.current.find(v => v.id === vehicleId)?.subTareas ?? painted.subTareas;
      const subTareas = (subTareasPainted ?? subTareasRaw.subTareas).map(st => {
        const g = subTareasRaw.subTareas.find(x => x.id === st.id);
        if (!g) return st;
        return {
          ...st,
          minutosCupo: g.minutosCupo ?? st.minutosCupo,
        };
      });
      const minutosPerdidos = subTareasRaw.minutosPerdidos;
      const bloqueListo = !subTareas.some(situacionFilaCronometroPendiente);
      let situacionCronometro =
        !bloqueListo && sc.activo !== true ? reanudarSituacionCronometroRing(sc) : sc;
      const anchorFresh =
        vehiclesRef.current.find(v => v.id === vehicleId)?.situacionCupoAnchor ??
        painted.situacionCupoAnchor ??
        null;
      let situacionCupoAnchor = bloqueListo ? null : anchorFresh;
      if (!bloqueListo && !situacionCupoAnchor?.subTareaId) {
        const resolvedAnchor = resolveCronometroCupoAnchor(subTareas, vehicle.situacionCupoAnchor, {
          forceResetSameRow: true,
          now,
        });
        situacionCupoAnchor =
          resolvedAnchor === "unchanged" ? vehicle.situacionCupoAnchor ?? null : resolvedAnchor;
      }
      setVehicles(prev =>
        prev.map(v =>
          v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
        )
      );
      vehiclesRef.current = vehiclesRef.current.map(v =>
        v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
      );
      scheduleSaveLocalVehicles(vehiclesRef.current);
      void runShadowTaskAsync(async () => {
        try {
          await updateVehicle(userId, vehicleId, {
            subTareas,
            situacionCronometro,
            situacionCupoAnchor,
          });
          if (bloqueListo) {
            toast.info("Ronda completada", {
              description: `Usa «${RING_COPY.cerrarRing}» para sellar la ronda o añade más filas al ring.`,
              duration: 4500,
            });
          } else {
            toast.info(
              minutosPerdidos > 0
                ? `Fallado · −${minutosPerdidos} min en cola`
                : "Fallado (sin PS de fila)",
              { description: targetSub.texto, duration: 2200 }
            );
          }
        } catch (e) {
          console.error("[handleSituacionCronometroFallado]", e);
        }
      });
    },
    [userId, vehicleById, vehiclesRef, setVehicles]
  );

  // ── handleReservaTacticaQuickAdd ─────────────────────────────────────────
  const handleReservaTacticaQuickAdd = useCallback(
    async (texto: string, ruta: ReservaTacticaRuta, proyectoId?: string) => {
      if (!userId) {
        toast.error("Inicia sesión para guardar pensamientos");
        throw new Error("no-user");
      }
      const trimmed = texto.trim();
      if (!trimmed) return;
      const proy = proyectoId ? proyectosHub.find(p => p.id === proyectoId) : undefined;
      try {
        const { localSaved, duplicate } = await addSituacionReserva(userId, {
          texto: trimmed,
          ruta,
          ...(proy
            ? {
                proyectoId: proy.id,
                proyectoTitulo: proy.titulo,
                proyectoEtiqueta: proy.etiqueta as "proyecto" | "centro" | undefined,
              }
            : {}),
          ...(segmentoActivo
            ? { segmentoId: segmentoActivo.id, segmentoNombre: segmentoActivo.nombre }
            : {}),
        });
        if (duplicate) return;
        if (!localSaved) {
          toast.error("No se pudo guardar en el dispositivo", {
            description: "Libera espacio en el navegador o cierra pestañas y vuelve a intentar.",
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
            duration: 5000,
          });
          throw new Error("local-save-failed");
        }
        const nidoLabel = proy ? proy.titulo : "aterrizaje pendiente";
        toast.success("Pensamiento aterrizado", {
          description: `${nidoLabel} · [${RUTA_TACTICA_META[ruta].short}] ${trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed}`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
          duration: 2800,
        });
      } catch (e) {
        if ((e as Error)?.message === "local-save-failed") throw e;
        console.error("[handleReservaTacticaQuickAdd]", e);
        toast.error("No se pudo aterrizar el pensamiento", {
          description:
            "Algo falló al procesar la captura. Cierra la pestaña, vuelve a abrir e inténtalo otra vez.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
        throw e;
      }
    },
    [userId, proyectosHub, segmentoActivo]
  );

  // ── handleReservaRutaChange ──────────────────────────────────────────────
  const handleReservaRutaChange = useCallback(
    async (reservaId: string, ruta: ReservaTacticaRuta) => {
      if (!userId) return;
      const prevRuta = situacionReserva.find(i => i.id === reservaId)?.ruta;
      setSituacionReserva(prev => prev.map(i => (i.id === reservaId ? { ...i, ruta } : i)));
      const localSaved = await updateSituacionReservaRuta(userId, reservaId, ruta);
      if (!localSaved) {
        setSituacionReserva(prev =>
          prev.map(i => (i.id === reservaId && prevRuta ? { ...i, ruta: prevRuta } : i))
        );
        toast.error("No se pudo cambiar la ruta", {
          description: "Libera espacio en el navegador e inténtalo de nuevo.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
      }
    },
    [userId, situacionReserva]
  );

  // ── handleEnviarReservaASituacion ────────────────────────────────────────
  const handleEnviarReservaASituacion = useCallback(
    async (reservaId: string) => {
      const item = reservaActivas.find(r => r.id === reservaId);
      if (!item) return;
      if (!reservaEsEnviabeASituacion(item)) {
        toast.info("Ruta M — tener en cuenta", {
          description: "Esta fila no va al vehículo de enfoque. Cambia a S o E para enviarla.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}40`, color: PLATA },
          duration: 4000,
        });
        return;
      }
      const ruta = item.ruta ?? "ejecucion";
      if (ruta === "situacion_desglosador") {
        await handleReservaACronometro(reservaId);
      } else {
        await handleReservaAListaLibre(reservaId);
      }
    },
    [reservaActivas, handleReservaACronometro, handleReservaAListaLibre]
  );

  return {
    situacionReserva,
    handleReservaTacticaQuickAdd,
    handleReservaRutaChange,
    handleEnviarReservaASituacion,
    handleToggleSubTarea,
    handleSituacionCronometroCumplido,
    handleSituacionCronometroFallado,
    handleDesglosadorUpdate,
  };
}
