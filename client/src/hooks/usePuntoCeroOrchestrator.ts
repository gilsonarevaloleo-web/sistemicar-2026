import { useCallback, useEffect, useRef } from "react";
import type { PuntoCeroSession } from "@/lib/puntoCeroTypes";
import {
  markWhisperDelivered,
  mensajeCompletado,
  tickPuntoCero,
} from "@/engines/PuntoCeroEngine";
import {
  speakPuntoCeroGuide,
  speakReactivacionDia,
  stopPleasantVoice,
  susurroNocheTexto,
} from "@/lib/puntoCeroVoice";

export type PuntoCeroOrchestratorCallbacks = {
  onSessionUpdate: (session: PuntoCeroSession) => void;
  onAutoClose: () => void;
  onEnterPasiva?: () => void;
  onCompletada?: (mensaje: string) => void;
};

function puntoCeroSessionChanged(a: PuntoCeroSession, b: PuntoCeroSession): boolean {
  return (
    a.fase !== b.fase ||
    a.faseInicioAt !== b.faseInicioAt ||
    a.sesionInicioAt !== b.sesionInicioAt ||
    a.ultimoSusurroAt !== b.ultimoSusurroAt ||
    a.autoCierreDisparado !== b.autoCierreDisparado ||
    a.duracionTotalMin !== b.duracionTotalMin ||
    a.modo !== b.modo ||
    a.coloresConfirmados.length !== b.coloresConfirmados.length ||
    a.coloresConfirmados.some((c, i) => c !== b.coloresConfirmados[i])
  );
}

/**
 * Tick cada 1s: transiciones de fase, susurros nocturnos y cierre automático.
 */
export function usePuntoCeroOrchestrator(
  session: PuntoCeroSession | null | undefined,
  enabled: boolean,
  callbacks: PuntoCeroOrchestratorCallbacks
) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const pasivaAnnouncedRef = useRef(false);
  const completadaAnnouncedRef = useRef(false);

  const runTick = useCallback(() => {
    const s = sessionRef.current;
    if (!s || s.fase === "completada") return;
    const now = Date.now();
    const { session: next, events } = tickPuntoCero(s, now);
    if (puntoCeroSessionChanged(s, next)) {
      cbRef.current.onSessionUpdate(next);
    }
    for (const ev of events) {
      if (ev.type === "enter_pasiva" && !pasivaAnnouncedRef.current) {
        pasivaAnnouncedRef.current = true;
        cbRef.current.onEnterPasiva?.();
      }
      if (ev.type === "whisper_due" && next.modo === "noche") {
        const texto = susurroNocheTexto(next.faseInicioAt, now);
        speakPuntoCeroGuide(texto, { profile: "night" });
        cbRef.current.onSessionUpdate(markWhisperDelivered(next, now));
      }
      if (ev.type === "enter_completada" && !completadaAnnouncedRef.current) {
        completadaAnnouncedRef.current = true;
        const msg = mensajeCompletado(next.modo);
        if (next.modo === "dia") {
          speakReactivacionDia();
        } else {
          stopPleasantVoice();
        }
        cbRef.current.onCompletada?.(msg);
      }
      if (ev.type === "auto_close_due") {
        cbRef.current.onAutoClose();
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !session) return;
    runTick();
    const id = window.setInterval(runTick, 1000);
    return () => clearInterval(id);
  }, [enabled, session?.fase, session?.sesionInicioAt, runTick]);

  useEffect(() => {
    if (!enabled) {
      stopPleasantVoice();
      pasivaAnnouncedRef.current = false;
      completadaAnnouncedRef.current = false;
    }
  }, [enabled]);
}
