import { useCallback, useEffect, useState } from "react";
import { isApuntado, isCerrado, type JornadaApunte } from "@shared/jornadaApunte";
import {
  JORNADA_APUNTE_EVENT,
  apuntarJornada,
  cerrarApunteJornada,
  readApunteDelDia,
} from "@/lib/jornadaApunteStore";
import { getJournalDateString } from "@/lib/segmentTime";

export function useJornadaApunte(nowMs: number = Date.now()) {
  const fecha = getJournalDateString(nowMs);
  const [record, setRecord] = useState<JornadaApunte | null>(() => readApunteDelDia(fecha, nowMs));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setRecord(readApunteDelDia(fecha));
    sync();
    window.addEventListener(JORNADA_APUNTE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(JORNADA_APUNTE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [fecha]);

  const apuntar = useCallback(
    (blanco: string) => {
      setError(null);
      try {
        setRecord(apuntarJornada(blanco));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo apuntar.");
      }
    },
    [],
  );

  const cerrar = useCallback((ocurrio: string, noOcurrio: string) => {
    setError(null);
    try {
      const next = cerrarApunteJornada(ocurrio, noOcurrio);
      setRecord(next);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar el apunte.");
      return null;
    }
  }, []);

  return {
    fecha,
    record,
    apuntado: isApuntado(record),
    cerrado: isCerrado(record),
    error,
    apuntar,
    cerrar,
  };
}
