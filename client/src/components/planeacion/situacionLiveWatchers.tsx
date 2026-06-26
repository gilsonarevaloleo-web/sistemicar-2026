import { useEffect } from "react";
import type { Vehicle } from "@/lib/persistence";
import { useVehicleTimerTick } from "@/lib/concienciaClock";
import { computeSafeRemainingSec } from "@/lib/hardwareClock";
import { fireSituacion2MinAlert, speakRingTiempoSobra } from "@/lib/situacionAlerts";
import { RING_SOBRA_INVITACION_MIN } from "@/lib/ringEnfoqueReal";
import { situacionContratoFinMs } from "@/lib/situacionGanancia";

/** Alerta de 2 min restantes en fila foco — tick aislado del card padre. */
export function Situacion2MinAlertWatcher({
  vehicle,
  situacionAnchorKey,
  warnKeyRef,
}: {
  vehicle: Vehicle;
  situacionAnchorKey: string;
  warnKeyRef: React.MutableRefObject<string | null>;
}) {
  const tick = useVehicleTimerTick();

  useEffect(() => {
    if (vehicle.tipoFlota !== "situacion" || vehicle.status !== "activo") return;
    const anchor = vehicle.situacionCupoAnchor;
    if (!anchor?.subTareaId) return;
    const sub = (vehicle.subTareas || []).find(s => s.id === anchor.subTareaId);
    if (!sub || !(sub.minutosCupo && sub.minutosCupo >= 2)) return;
    if (sub.enDesgloseCronometro && (sub.resultadoSituacion ?? "pendiente") !== "pendiente") return;
    if (!sub.enDesgloseCronometro && sub.completada) return;
    const remainSec = computeSafeRemainingSec(anchor.startedAt, sub.minutosCupo);
    if (remainSec !== 120 && remainSec !== 119 && remainSec !== 118) return;
    const warnKey = `2m-${anchor.subTareaId}-${anchor.startedAt}-${sub.minutosCupo}`;
    if (warnKeyRef.current === warnKey) return;
    warnKeyRef.current = warnKey;
    fireSituacion2MinAlert({
      vehicleId: vehicle.id,
      vehicleTitulo: vehicle.titulo,
      subTexto: sub.texto,
      tagKey: warnKey,
    });
  }, [
    vehicle.tipoFlota,
    vehicle.status,
    situacionAnchorKey,
    vehicle.titulo,
    vehicle.id,
    vehicle.situacionCupoAnchor,
    vehicle.subTareas,
    tick,
    warnKeyRef,
  ]);

  return null;
}

/** Voz «tiempo sobra» en ring — tick aislado del card padre. */
export function SituacionRingSobraVoiceWatcher({
  vehicle,
  situacionBloqueListo,
  voiceKeyRef,
  pendingRef,
}: {
  vehicle: Vehicle;
  situacionBloqueListo: boolean;
  voiceKeyRef: React.MutableRefObject<string | null>;
  pendingRef: React.MutableRefObject<string | null>;
}) {
  const tick = useVehicleTimerTick();

  useEffect(() => {
    if (vehicle.tipoFlota !== "situacion" || vehicle.status !== "activo") return;
    if (!situacionBloqueListo) return;
    const sc = vehicle.situacionCronometro;
    if (sc?.activo !== true) return;
    const contratoMs = situacionContratoFinMs(sc);
    if (contratoMs == null) return;
    const sobraMin = Math.round((contratoMs - Date.now()) / 60000);
    if (sobraMin < RING_SOBRA_INVITACION_MIN) return;
    const key = `${vehicle.id}_${sc.bloqueInicioAt ?? 0}`;
    if (voiceKeyRef.current === key) return;
    if (pendingRef.current === key) return;
    pendingRef.current = key;
    return speakRingTiempoSobra(sobraMin, key, () => {
      voiceKeyRef.current = key;
      pendingRef.current = null;
    });
  }, [
    vehicle.tipoFlota,
    vehicle.status,
    vehicle.situacionCronometro,
    vehicle.id,
    situacionBloqueListo,
    tick,
    voiceKeyRef,
    pendingRef,
  ]);

  return null;
}
