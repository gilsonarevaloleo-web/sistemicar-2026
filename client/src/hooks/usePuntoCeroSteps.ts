import { useCallback, useEffect, useRef, useState } from "react";
import type { PuntoCeroEtapaKey } from "@/lib/puntoCeroGuides";
import { getIsRemountingJornada } from "@/lib/jornadaRemount";
import {
  buildPuntoCeroPasos,
  cancelPuntoCeroStepVoice,
  clearPuntoCeroStepVoiceRemountPause,
  isPuntoCeroStepVoicePausedByRemount,
  speakPuntoCeroPaso,
  startPuntoCeroGuiaPasos,
  type PuntoCeroPasoDef,
} from "@/lib/puntoCeroStepVoice";
import { unlockPuntoCeroSpeechFromGesture } from "@/lib/puntoCeroVoice";

export type UsePuntoCeroStepsOptions = {
  /** Marca etapa completada (+PS) al terminar la voz del paso. */
  onEtapaCompletada?: (etapa: PuntoCeroEtapaKey) => void;
  /** Desbloquea audio ambiental Solfeggio. */
  onUnlockAudio?: () => void | Promise<void>;
};

export type PuntoCeroPasoGuiaIndex = -1 | 0 | 1 | 2 | 3;

/**
 * Máquina de pasos Punto Cero: -1 detenido, 0..3 pasos 1..4 en voz guía.
 */
export function usePuntoCeroSteps(opts: UsePuntoCeroStepsOptions = {}) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const [pasoActual, setPasoActual] = useState<PuntoCeroPasoGuiaIndex>(-1);
  const [leyendo, setLeyendo] = useState(false);
  const includeIntroRef = useRef(true);
  const pasoActualRef = useRef(pasoActual);
  pasoActualRef.current = pasoActual;

  const pasosRef = useRef<PuntoCeroPasoDef[]>(buildPuntoCeroPasos(false));

  const markEtapaIfNeeded = useCallback((index: number) => {
    const paso = pasosRef.current[index];
    if (!paso || paso.etapa === "etapa4") return;
    optsRef.current.onEtapaCompletada?.(paso.etapa);
  }, []);

  const makeCallbacks = useCallback(
    () => ({
      onPasoStart: (index: number) => {
        setPasoActual(index as PuntoCeroPasoGuiaIndex);
        setLeyendo(true);
      },
      onPasoComplete: (index: number) => {
        markEtapaIfNeeded(index);
      },
      onAutoAdvance: (nextIndex: number) => {
        setPasoActual(nextIndex as PuntoCeroPasoGuiaIndex);
      },
      onSequenceIdle: () => {
        setLeyendo(false);
        setPasoActual(-1);
      },
    }),
    [markEtapaIfNeeded]
  );

  const irAPaso = useCallback(
    async (index: 0 | 1 | 2 | 3) => {
      if (getIsRemountingJornada()) return;
      cancelPuntoCeroStepVoice();
      clearPuntoCeroStepVoiceRemountPause();
      unlockPuntoCeroSpeechFromGesture();
      await optsRef.current.onUnlockAudio?.();
      const list = buildPuntoCeroPasos(false);
      pasosRef.current = list;
      setPasoActual(index);
      setLeyendo(true);
      speakPuntoCeroPaso(index, list, makeCallbacks());
    },
    [makeCallbacks]
  );

  const iniciar = useCallback(async () => {
    if (getIsRemountingJornada()) return;
    unlockPuntoCeroSpeechFromGesture();
    await optsRef.current.onUnlockAudio?.();
    const withIntro = includeIntroRef.current;
    if (withIntro) includeIntroRef.current = false;
    const list = buildPuntoCeroPasos(withIntro);
    pasosRef.current = list;
    setPasoActual(0);
    setLeyendo(true);
    startPuntoCeroGuiaPasos(0, list, makeCallbacks());
  }, [makeCallbacks]);

  const siguientePaso = useCallback(() => {
    const cur = pasoActualRef.current;
    if (cur < 0 || cur >= 2) return;
    void irAPaso((cur + 1) as 0 | 1 | 2 | 3);
  }, [irAPaso]);

  const terminar = useCallback(() => {
    cancelPuntoCeroStepVoice();
    setLeyendo(false);
    setPasoActual(-1);
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (getIsRemountingJornada()) {
        cancelPuntoCeroStepVoice();
        setLeyendo(false);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    return () => {
      cancelPuntoCeroStepVoice();
    };
  }, []);

  const [remountBlocked, setRemountBlocked] = useState(
    () => getIsRemountingJornada() || isPuntoCeroStepVoicePausedByRemount()
  );

  useEffect(() => {
    const sync = () =>
      setRemountBlocked(getIsRemountingJornada() || isPuntoCeroStepVoicePausedByRemount());
    sync();
    const id = window.setInterval(sync, 250);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return {
    pasoActual,
    leyendo,
    iniciar,
    irAPaso,
    siguientePaso,
    terminar,
    remountBlocked,
  };
}
