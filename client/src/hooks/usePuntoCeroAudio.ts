import { useCallback, useEffect, useRef, useState } from "react";
import type { FasePuntoCero, ModoPuntoCero } from "@/lib/puntoCeroTypes";
import {
  ensurePuntoCeroAudioContext,
  fadeMasterToSilence,
  masterOutputGain,
  playReactivacionAlfa,
  playSolfeggioTone,
  PUNTO_CERO_AUDIO_TUNING,
  setMasterGainLevel,
  startBinauralBeat,
  type BinauralHandle,
  type PuntoCeroBinauralPreset,
} from "@/lib/puntoCeroAudio";

const MUTE_STORAGE_KEY = "sistemicar_punto_cero_audio_muted";
const VOLUME_STORAGE_KEY = "sistemicar_punto_cero_audio_volume";

function presetForFase(fase: FasePuntoCero, modo: ModoPuntoCero): PuntoCeroBinauralPreset | null {
  if (fase === "activa" || fase === "preparacion") return "alpha";
  if (fase === "pasiva") return modo === "dia" ? "theta" : "delta";
  return null;
}

function readMutedPreference(): boolean {
  try {
    return sessionStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readVolumePreference(): number {
  try {
    const raw = sessionStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw == null) return PUNTO_CERO_AUDIO_TUNING.defaultVolumePct;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return PUNTO_CERO_AUDIO_TUNING.defaultVolumePct;
    return Math.max(0, Math.min(100, n));
  } catch {
    return PUNTO_CERO_AUDIO_TUNING.defaultVolumePct;
  }
}

export function usePuntoCeroAudio(
  enabled: boolean,
  modo: ModoPuntoCero | undefined,
  fase: FasePuntoCero
) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const binauralRef = useRef<BinauralHandle | null>(null);
  const activePresetRef = useRef<PuntoCeroBinauralPreset | null>(null);
  const unlockedRef = useRef(false);
  const mutedRef = useRef(readMutedPreference());
  const volumeRef = useRef(readVolumePreference());

  const [muted, setMuted] = useState(mutedRef.current);
  const [volume, setVolumeState] = useState(volumeRef.current);
  const [unlocked, setUnlocked] = useState(false);

  const effectiveGain = useCallback(
    () => (mutedRef.current ? 0 : masterOutputGain(volumeRef.current)),
    []
  );

  const applyEffectiveGain = useCallback(
    async (fadeSec = PUNTO_CERO_AUDIO_TUNING.unmuteFadeSec) => {
      const ctx = await ensurePuntoCeroAudioContext(ctxRef.current);
      if (!ctx) return;
      ctxRef.current = ctx;
      const master = masterRef.current;
      if (!master) return;
      setMasterGainLevel(ctx, master, effectiveGain(), fadeSec);
    },
    [effectiveGain]
  );

  const ensureGraph = useCallback(async () => {
    const ctx = await ensurePuntoCeroAudioContext(ctxRef.current);
    if (!ctx) return null;
    ctxRef.current = ctx;
    if (!masterRef.current) {
      const master = ctx.createGain();
      master.gain.value = effectiveGain();
      master.connect(ctx.destination);
      masterRef.current = master;
    }
    if (ctx.state === "running") {
      unlockedRef.current = true;
      setUnlocked(true);
    }
    return ctx;
  }, [effectiveGain]);

  const setBinauralLayer = useCallback(
    async (preset: PuntoCeroBinauralPreset | null) => {
      if (!enabled || !unlockedRef.current || mutedRef.current || volumeRef.current <= 0) return;
      const ctx = await ensureGraph();
      const master = masterRef.current;
      if (!ctx || !master) return;
      if (preset === activePresetRef.current && binauralRef.current) return;
      binauralRef.current?.stop(PUNTO_CERO_AUDIO_TUNING.binauralCrossfadeSec);
      binauralRef.current = null;
      activePresetRef.current = null;
      if (!preset) return;
      binauralRef.current = startBinauralBeat(
        ctx,
        master,
        preset,
        PUNTO_CERO_AUDIO_TUNING.binauralFadeInSec
      );
      activePresetRef.current = preset;
    },
    [enabled, ensureGraph]
  );

  const unlockAudio = useCallback(async () => {
    const ctx = await ensureGraph();
    if (ctx?.state !== "running") return;
    unlockedRef.current = true;
    setUnlocked(true);
    if (mutedRef.current || volumeRef.current <= 0) return;
    if (modo) {
      const preset = presetForFase(fase, modo);
      if (preset) await setBinauralLayer(preset);
    }
  }, [ensureGraph, fase, modo, setBinauralLayer]);

  const setVolume = useCallback(
    async (pct: number) => {
      const next = Math.max(0, Math.min(100, Math.round(pct)));
      volumeRef.current = next;
      setVolumeState(next);
      try {
        sessionStorage.setItem(VOLUME_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      if (next > 0 && mutedRef.current) {
        mutedRef.current = false;
        setMuted(false);
        try {
          sessionStorage.setItem(MUTE_STORAGE_KEY, "0");
        } catch {
          /* ignore */
        }
      }
      await applyEffectiveGain(0.12);
      const ctx = await ensureGraph();
      if (ctx?.state === "running") {
        unlockedRef.current = true;
        setUnlocked(true);
      }
      if (!mutedRef.current && next > 0 && unlockedRef.current && modo) {
        const preset = presetForFase(fase, modo);
        if (preset && !binauralRef.current) await setBinauralLayer(preset);
      }
      if (next <= 0) {
        binauralRef.current?.stop(PUNTO_CERO_AUDIO_TUNING.binauralStopSec);
        binauralRef.current = null;
        activePresetRef.current = null;
      }
    },
    [applyEffectiveGain, ensureGraph, fase, modo, setBinauralLayer]
  );

  const toggleMute = useCallback(async () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    try {
      sessionStorage.setItem(MUTE_STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    const ctx = await ensureGraph();
    const master = masterRef.current;
    if (!ctx || !master) return;
    if (next) {
      binauralRef.current?.stop(PUNTO_CERO_AUDIO_TUNING.binauralStopSec);
      binauralRef.current = null;
      activePresetRef.current = null;
      setMasterGainLevel(ctx, master, 0, PUNTO_CERO_AUDIO_TUNING.muteFadeSec);
    } else {
      if (ctx.state === "running") {
        unlockedRef.current = true;
        setUnlocked(true);
      }
      if (volumeRef.current <= 0) {
        volumeRef.current = PUNTO_CERO_AUDIO_TUNING.defaultVolumePct;
        setVolumeState(volumeRef.current);
        try {
          sessionStorage.setItem(VOLUME_STORAGE_KEY, String(volumeRef.current));
        } catch {
          /* ignore */
        }
      }
      setMasterGainLevel(ctx, master, effectiveGain(), PUNTO_CERO_AUDIO_TUNING.unmuteFadeSec);
      if (unlockedRef.current && modo && volumeRef.current > 0) {
        const preset = presetForFase(fase, modo);
        if (preset) await setBinauralLayer(preset);
      }
    }
  }, [effectiveGain, ensureGraph, fase, modo, setBinauralLayer]);

  const playSolfeggio = useCallback(
    async (hz: number) => {
      if (mutedRef.current || volumeRef.current <= 0) return;
      await unlockAudio();
      const ctx = await ensureGraph();
      const master = masterRef.current;
      if (!ctx || !master || !enabled) return;
      playSolfeggioTone(ctx, master, hz);
    },
    [enabled, ensureGraph, unlockAudio]
  );

  const onCompletada = useCallback(
    async (modoComplete: ModoPuntoCero) => {
      if (mutedRef.current || volumeRef.current <= 0) return;
      const ctx = await ensureGraph();
      const master = masterRef.current;
      if (!ctx || !master) return;
      binauralRef.current?.stop(PUNTO_CERO_AUDIO_TUNING.binauralStopSec);
      binauralRef.current = null;
      activePresetRef.current = null;
      if (modoComplete === "dia") {
        setMasterGainLevel(ctx, master, effectiveGain(), 0.2);
        playReactivacionAlfa(ctx, master);
      } else {
        fadeMasterToSilence(ctx, master, PUNTO_CERO_AUDIO_TUNING.nocheFadeOutSec);
      }
    },
    [effectiveGain, ensureGraph]
  );

  const stopAll = useCallback(() => {
    binauralRef.current?.stop(PUNTO_CERO_AUDIO_TUNING.binauralStopSec);
    binauralRef.current = null;
    activePresetRef.current = null;
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (ctx && master) {
      fadeMasterToSilence(ctx, master, 0.5);
    }
  }, []);

  const releaseHardware = useCallback(() => {
    binauralRef.current?.stop(0);
    binauralRef.current = null;
    activePresetRef.current = null;
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (master) {
      try {
        master.disconnect();
      } catch {
        /* noop */
      }
    }
    masterRef.current = null;
    unlockedRef.current = false;
    if (ctx && ctx.state !== "closed") {
      void ctx.suspend().then(() => {
        if (ctx.state !== "closed") void ctx.close();
      }).catch(() => {
        try {
          if (ctx.state !== "closed") void ctx.close();
        } catch {
          /* noop */
        }
      });
    }
    ctxRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled || !modo || !unlockedRef.current || mutedRef.current || volumeRef.current <= 0) return;
    const preset = presetForFase(fase, modo);
    void setBinauralLayer(preset);
  }, [enabled, fase, modo, setBinauralLayer]);

  useEffect(() => {
    if (!enabled) stopAll();
    return () => {
      stopAll();
      releaseHardware();
    };
  }, [enabled, releaseHardware, stopAll]);

  return {
    unlockAudio,
    playSolfeggio,
    onCompletada,
    stopAll,
    muted,
    volume,
    unlocked,
    toggleMute,
    setVolume,
  };
}
