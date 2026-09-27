/**
 * Entitlements comerciales Jornada V4: Base / Ritmo / Norte.
 * Owner y preview ops → acceso completo.
 */
import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "@/App";
import {
  extrasFromProgression,
  hasNorteAccess,
  hasPlanificacionBaseAccess,
  hasRitmoAccess,
  resolveUserJornadaBaseAccess,
  subscribeToProgression,
  type UserProgression,
} from "@/lib/persistence";
import { isPreviewOpsUnlocked } from "@/lib/previewOps";
import type { JornadaBaseAccess } from "@shared/jornadaBaseAccess";
import { isOwnerEmail } from "@shared/moduleAccess";

export type PlanificacionEntitlements = {
  ready: boolean;
  /** Jornada Base — Conquista + PS */
  hasBase: boolean;
  /** Ritmo — segmentos + Situacional */
  hasRitmo: boolean;
  /** Norte — Crisol + Hub */
  hasNorte: boolean;
  /** Bypass owner / preview */
  bypass: boolean;
  /** Cómo se abrió Base (pago, trial, 500 PS). */
  baseGrant: JornadaBaseAccess;
};

export function usePlanificacionEntitlements(): PlanificacionEntitlements {
  const { user } = useAuthContext();
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [ready, setReady] = useState(false);
  const [previewOps, setPreviewOps] = useState(() => isPreviewOpsUnlocked());

  useEffect(() => {
    const sync = () => setPreviewOps(isPreviewOpsUnlocked());
    sync();
    window.addEventListener("sistemicar-preview-ops", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sistemicar-preview-ops", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setProgression(null);
      setReady(true);
      return;
    }
    setReady(false);
    const unsub = subscribeToProgression(
      user.uid,
      (prog) => {
        setProgression(prog);
        setReady(true);
      },
      () => {
        setProgression(null);
        setReady(true);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  return useMemo(() => {
    const bypass = isOwnerEmail(user?.email) || previewOps || isPreviewOpsUnlocked();
    if (bypass) {
      return {
        ready: true,
        hasBase: true,
        hasRitmo: true,
        hasNorte: true,
        bypass: true,
        baseGrant: {
          allowed: true,
          kind: "owner",
          points: progression?.sovereigntyPoints ?? 0,
          pointsRemaining: 0,
        },
      };
    }
    const extras = extrasFromProgression(progression);
    const args = [
      progression?.subscriptionPlan,
      user?.email,
      progression?.rank,
      progression?.activeModules,
    ] as const;
    const baseGrant = resolveUserJornadaBaseAccess(...args, extras);
    return {
      ready,
      hasBase: hasPlanificacionBaseAccess(...args, extras),
      hasRitmo: hasRitmoAccess(...args),
      hasNorte: hasNorteAccess(...args),
      bypass: false,
      baseGrant,
    };
  }, [user?.email, progression, ready, previewOps]);
}
