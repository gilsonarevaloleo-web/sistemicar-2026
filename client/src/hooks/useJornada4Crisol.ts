/**
 * Crisol MOS en Dual Kernel — mismo dock que clásica, sin voz/manager.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MutableRefObject,
} from "react";
import { toast } from "sonner";
import { updateVehicle, type SegmentoV5, type Vehicle } from "@/lib/persistence";
import { scheduleSaveLocalVehicles } from "@/lib/deferredVehicleSave";
import { runShadowTaskAsync, yieldAfterPaint } from "@/lib/desglosadorShadow";
import { burstJornada4Tick } from "@/jornada4/jornada4Tick";
import {
  injectCrisolOpeningRing,
  injectCrisolToActiveRing,
  injectCrisolToListaLibre,
  pickSituacionVehicleTarget,
} from "@/jornada4/crisolKernel";
import {
  imanItemsParaDesglosador,
  nidoKeyFromReserva,
  reservaEsEnviabeASituacion,
  type ImanProyectoOpcion,
} from "@/lib/imanPensamientos";
import {
  evaluateDireccionElegibilidad,
  resolveRumboTrasEnvio,
} from "@/lib/direccionElegibilidad";
import { getPeldanosByProyectoLocal, getProyectosLocal } from "@/lib/proyectos";
import {
  addSituacionReserva,
  deleteSituacionReserva,
  getReservaActivas,
  RUTA_TACTICA_META,
  sortReservasTacticas,
  subscribeToSituacionReserva,
  updateSituacionReservaEstado,
  updateSituacionReservaRuta,
  type ReservaTacticaRuta,
  type SituacionReservaItem,
} from "@/lib/situacionReserva";

const PIZARRA = "#0a0a0a";
const EMERALD = "#00C851";
const BLOOD = "#FF2A2A";
const PLATA = "#C0C0C0";
const GOLD = "#D4AF37";

export type UseJornada4CrisolParams = {
  userId: string | undefined;
  vehiclesRef: MutableRefObject<Vehicle[]>;
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  segmentoActivo: SegmentoV5 | null;
  proyectosHub: Array<{ id: string; titulo: string; etiqueta?: string }>;
};

export function useJornada4Crisol(params: UseJornada4CrisolParams) {
  const {
    userId,
    vehiclesRef,
    setVehicles,
    expandedId,
    setExpandedId,
    segmentoActivo,
    proyectosHub,
  } = params;

  const [situacionReserva, setSituacionReserva] = useState<SituacionReservaItem[]>(
    []
  );

  useEffect(() => {
    if (!userId) {
      setSituacionReserva([]);
      return;
    }
    const unsub = subscribeToSituacionReserva(
      userId,
      setSituacionReserva,
      e => console.error(e)
    );
    return () => unsub();
  }, [userId]);

  const reservaActivas = useMemo(
    () => getReservaActivas(situacionReserva),
    [situacionReserva]
  );

  const imanProyectos = useMemo<ImanProyectoOpcion[]>(
    () =>
      proyectosHub.map(p => ({
        id: p.id,
        titulo: p.titulo,
        etiqueta: (p.etiqueta as ImanProyectoOpcion["etiqueta"]) ?? "proyecto",
      })),
    [proyectosHub]
  );

  const paintVehicle = useCallback(
    (
      vehicleId: string,
      patch: Partial<Vehicle>
    ) => {
      const map = (list: Vehicle[]) =>
        list.map(v => (v.id === vehicleId ? { ...v, ...patch } : v));
      vehiclesRef.current = map(vehiclesRef.current);
      setVehicles(map);
      burstJornada4Tick();
    },
    [setVehicles, vehiclesRef]
  );

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
          description: `${nidoLabel} · [${RUTA_TACTICA_META[ruta].short}] ${
            trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed
          }`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
          duration: 2800,
        });
      } catch (e) {
        if ((e as Error)?.message === "local-save-failed") throw e;
        console.error("[j4.handleReservaTacticaQuickAdd]", e);
        toast.error("No se pudo aterrizar el pensamiento", {
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
        throw e;
      }
    },
    [userId, proyectosHub, segmentoActivo]
  );

  const handleReservaRutaChange = useCallback(
    async (reservaId: string, ruta: ReservaTacticaRuta) => {
      if (!userId) return;
      const prevRuta = situacionReserva.find(i => i.id === reservaId)?.ruta;
      setSituacionReserva(prev =>
        prev.map(i => (i.id === reservaId ? { ...i, ruta } : i))
      );
      const localSaved = await updateSituacionReservaRuta(userId, reservaId, ruta);
      if (!localSaved) {
        setSituacionReserva(prev =>
          prev.map(i =>
            i.id === reservaId && prevRuta ? { ...i, ruta: prevRuta } : i
          )
        );
        toast.error("No se pudo cambiar la ruta", {
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
      }
    },
    [userId, situacionReserva]
  );

  const handleReservaEliminar = useCallback(
    async (reservaId: string) => {
      if (!userId) return;
      const backup = situacionReserva.find(i => i.id === reservaId);
      setSituacionReserva(prev => prev.filter(i => i.id !== reservaId));
      const localSaved = await deleteSituacionReserva(userId, reservaId);
      if (!localSaved && backup) {
        setSituacionReserva(prev => sortReservasTacticas([backup, ...prev]));
        toast.error("No se pudo eliminar la reserva", {
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
        return;
      }
      toast.info("Eliminada de la reserva", { duration: 1800 });
    },
    [userId, situacionReserva]
  );

  const markReservaRetomada = useCallback(
    async (
      reservaId: string,
      estado: "retomada_libre" | "retomada_cron",
      vehicleId: string
    ) => {
      if (!userId) return false;
      const localSaved = await updateSituacionReservaEstado(userId, reservaId, estado, {
        retomadaAt: Date.now(),
        retomadaEnVehiculoId: vehicleId,
      });
      if (!localSaved) {
        toast.error("No se pudo actualizar la reserva", {
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
        return false;
      }
      setSituacionReserva(prev =>
        prev.map(i =>
          i.id === reservaId
            ? {
                ...i,
                estado,
                retomadaAt: Date.now(),
                retomadaEnVehiculoId: vehicleId,
              }
            : i
        )
      );
      return true;
    },
    [userId]
  );

  const handleEnviarReservaASituacion = useCallback(
    async (reservaId: string, opts?: { skipYield?: boolean; quietToast?: boolean }) => {
      if (!userId) return;
      const item = reservaActivas.find(r => r.id === reservaId);
      if (!item) return;
      if (!reservaEsEnviabeASituacion(item)) {
        if (!opts?.quietToast) {
          toast.info("Ruta M — tener en cuenta", {
            description: "Cambia a S o E para enviarla al vehículo de enfoque.",
            style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}40`, color: PLATA },
            duration: 4000,
          });
        }
        return;
      }

      const activos = vehiclesRef.current.filter(
        v => v.status === "activo" && v.tipoFlota === "situacion"
      );
      const preferred =
        item.origenVehiculoId
          ? activos.find(v => v.id === item.origenVehiculoId)
          : undefined;
      const picked = preferred
        ? { vehicle: preferred, ambiguous: false }
        : pickSituacionVehicleTarget(vehiclesRef.current, expandedId);

      if (!picked.vehicle) {
        toast.error(
          picked.ambiguous
            ? "Expande el vehículo de enfoque destino"
            : "Abre un vehículo de enfoque activo",
          { style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD } }
        );
        return;
      }

      const vehicle = picked.vehicle;
      const ruta = item.ruta ?? "ejecucion";
      const segProy = segmentoActivo?.proyectoVinculadoId;

      const result =
        ruta === "situacion_desglosador"
          ? vehicle.situacionCronometro?.activo === true
            ? injectCrisolToActiveRing(vehicle, item, {
                segmentoProyectoId: segProy,
              })
            : injectCrisolOpeningRing(vehicle, item, {
                segmentoHoraFin: segmentoActivo?.horaFin,
                segmentoProyectoId: segProy,
              })
          : injectCrisolToListaLibre(vehicle, item);

      if (!result.ok) {
        if (result.reason === "invalid_objetivo") {
          toast.error("Tiempo objetivo inválido", {
            description: "Abre un segmento con hora fin futura, o lanza el ring primero.",
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          });
        } else if (result.reason === "invalid_budget") {
          toast.error("Meta del reto no disponible", {
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          });
        } else {
          toast.error("No se pudo enviar al enfoque", {
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          });
        }
        return;
      }

      const patch: Partial<Vehicle> = { subTareas: result.subTareas };
      if (result.situacionCronometro) patch.situacionCronometro = result.situacionCronometro;
      if (result.situacionCupoAnchor !== undefined) {
        patch.situacionCupoAnchor = result.situacionCupoAnchor;
      }
      const nidoId = result.proyectoId?.trim() || item.proyectoId?.trim();
      let rumboCopy = "Enviado a presencia.";
      if (nidoId && userId) {
        const hubTitulo = proyectosHub.find(h => h.id === nidoId)?.titulo;
        const p = getProyectosLocal(userId).find(x => x.id === nidoId) ?? {
          id: nidoId,
          titulo: hubTitulo ?? "Proyecto",
        };
        const gate = evaluateDireccionElegibilidad(
          p,
          getPeldanosByProyectoLocal(userId, nidoId)
        );
        const rumbo = resolveRumboTrasEnvio({ nidoProyectoId: nidoId, gate });
        rumboCopy = rumbo.copy;
        if (rumbo.stampVehicle) {
          patch.proyectoId = rumbo.proyectoId;
          patch.destinoCierre = rumbo.destinoCierre;
          if (rumbo.oleadaPuntoId) patch.oleadaPuntoId = rumbo.oleadaPuntoId;
        }
      }

      paintVehicle(result.vehicleId, patch);
      setExpandedId(result.vehicleId);
      if (!opts?.skipYield) await yieldAfterPaint();

      const estado =
        result.mode === "lista_libre" ? "retomada_libre" : "retomada_cron";
      const marked = await markReservaRetomada(reservaId, estado, result.vehicleId);
      if (!marked) return;

      void runShadowTaskAsync(async () => {
        scheduleSaveLocalVehicles(vehiclesRef.current);
        try {
          await updateVehicle(userId, result.vehicleId, patch, {
            skipLocalSync: true,
          });
        } catch (e) {
          console.error("[j4.handleEnviarReservaASituacion]", e);
        }
      });

      if (opts?.quietToast) return;

      const claimedDireccion = patch.destinoCierre === "peldano";
      const toastStyle = {
        backgroundColor: PIZARRA,
        border: `1px solid ${claimedDireccion ? GOLD : EMERALD}`,
        color: claimedDireccion ? GOLD : EMERALD,
      };

      if (result.mode === "lista_libre") {
        toast.success("Retomada en lista libre", {
          description: `${item.texto} · ${rumboCopy}`,
          style: toastStyle,
          duration: 3200,
        });
      } else if (result.mode === "open_ring") {
        toast.success("Ring abierto desde El Crisol", {
          description: `${item.texto} · ${rumboCopy}`,
          style: toastStyle,
          duration: 3200,
        });
      } else {
        toast.success("Añadido a la cola del ring", {
          description: `${item.texto} · ${rumboCopy}`,
          style: toastStyle,
          duration: 3200,
        });
      }
    },
    [
      userId,
      reservaActivas,
      vehiclesRef,
      expandedId,
      segmentoActivo,
      proyectosHub,
      paintVehicle,
      setExpandedId,
      markReservaRetomada,
    ]
  );

  const handleEnviarReservasSeleccionadas = useCallback(
    async (reservaIds: string[]) => {
      const ids = reservaIds.filter(Boolean);
      if (ids.length === 0) return;
      const batch = ids.length > 1;
      for (let i = 0; i < ids.length; i++) {
        const last = i === ids.length - 1;
        await handleEnviarReservaASituacion(ids[i], {
          // Un solo yield al final; en lote un toast resumen.
          skipYield: !last,
          quietToast: batch,
        });
      }
      if (batch) {
        toast.success(`${ids.length} pensamientos enviados al enfoque`, {
          style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
          duration: 2800,
        });
      }
    },
    [handleEnviarReservaASituacion]
  );

  const handleAbrirNidoEnSituacion = useCallback(
    async (nidoId: string) => {
      const nidoItems = reservaActivas.filter(i => nidoKeyFromReserva(i) === nidoId);
      const ejecutables = imanItemsParaDesglosador(nidoItems);
      if (ejecutables.length === 0) {
        toast.error("Nido sin pensamientos ejecutables", {
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
        return;
      }
      await handleEnviarReservasSeleccionadas(ejecutables.map(i => i.id));
    },
    [reservaActivas, handleEnviarReservasSeleccionadas]
  );

  return {
    situacionReserva,
    reservaActivas,
    imanProyectos,
    handleReservaTacticaQuickAdd,
    handleReservaRutaChange,
    handleReservaEliminar,
    handleEnviarReservaASituacion,
    handleEnviarReservasSeleccionadas,
    handleAbrirNidoEnSituacion,
  };
}
