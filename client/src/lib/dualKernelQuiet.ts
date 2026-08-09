/**
 * Quiet Dual Kernel: pausa motores globales del App shell en `/jornada-v4`
 * y, al salir, aplica un soft-start compartido para no colapsar el hilo al
 * montar Espejo, Admin, Hub Proyectos u otros módulos (Menú hamburguesa incluido).
 *
 * Latch a nivel de módulo (no por instancia de hook):
 * - El #41 dejaba un hueco de 1 frame: `exitQuiet` solo se armaba en useEffect,
 *   así Centinela/SegmentAttention/Cierre armaban Firebase en el mismo commit
 *   que el unmount de Jornada + mount del destino.
 * - Destinos nuevos (Admin/Espejo) inicializaban su propio `exitQuiet=false`
 *   y nunca veían el soft-start.
 * - Hub Proyectos (#50) difería Firestore, pero el soft-start corto no bastaba:
 *   al soltar, el reloj 1 s del ring + Centinela clavaban el detalle.
 */
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { useLocation } from "wouter";
import { isAppShellQuietPath, isJornada4Path } from "@/lib/jornadaBrand";
import { isMobilePerfMode } from "@/lib/mobilePerf";

/** Tras salir de Dual Kernel, diferir Centinela / SegmentAttention / Cierre / destinos pesados. */
export const DUAL_KERNEL_EXIT_SOFT_MS = isMobilePerfMode() ? 2_500 : 1_200;

/**
 * Ring → Hub Proyectos o Centro de Comando (`/menu`): soft-start más largo.
 * Esas pantallas necesitan toques (abrir detalle / tarjetas) mientras el ring
 * sigue “vivo” en flotaStore; 1–2.5 s no alcanza antes de que el reloj 1 s y
 * Centinela saturen el hilo.
 */
export const DUAL_KERNEL_HUB_EXIT_SOFT_MS = isMobilePerfMode() ? 5_500 : 3_000;

let softUntilMs = 0;
let softTimer: ReturnType<typeof setTimeout> | null = null;
/** Última ruta Dual Kernel vista por cualquier consumidor (compartido). */
let moduleSeenOnJ4 = false;
const softListeners = new Set<() => void>();

function notifySoftListeners(): void {
  softListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

function subscribeSoft(listener: () => void): () => void {
  softListeners.add(listener);
  return () => softListeners.delete(listener);
}

function getSoftSnapshot(): boolean {
  return Date.now() < softUntilMs;
}

function scheduleSoftRelease(): void {
  if (softTimer) clearTimeout(softTimer);
  const remaining = Math.max(0, softUntilMs - Date.now());
  softTimer = setTimeout(() => {
    softTimer = null;
    softUntilMs = 0;
    notifySoftListeners();
  }, remaining || DUAL_KERNEL_EXIT_SOFT_MS);
}

/** True si el soft-start de salida sigue activo (lectura síncrona). */
export function isDualKernelExitSoftActive(): boolean {
  return Date.now() < softUntilMs;
}

export type ArmDualKernelExitSoftOpts = {
  /** Destino de la navegación (p. ej. `/proyectos`) — alarga soft-start al Hub. */
  href?: string;
  /** Override explícito de duración. */
  durationMs?: number;
};

function resolveSoftDuration(opts?: ArmDualKernelExitSoftOpts): number {
  if (opts?.durationMs != null && opts.durationMs > 0) return opts.durationMs;
  if (opts?.href && isAppShellQuietPath(opts.href)) {
    return DUAL_KERNEL_HUB_EXIT_SOFT_MS;
  }
  return DUAL_KERNEL_EXIT_SOFT_MS;
}

/**
 * Arma el soft-start de forma síncrona — llamar en el click de nav
 * ANTES de cambiar la ruta (NavTransitionLink).
 */
export function armDualKernelExitSoftStart(opts?: ArmDualKernelExitSoftOpts | number): void {
  const normalized: ArmDualKernelExitSoftOpts |
    undefined =
    typeof opts === "number" ? { durationMs: opts } : opts;
  const ms = resolveSoftDuration(normalized);
  // No acortar un soft-start Hub ya armado (p. ej. ViewTransitionBootstrap backup).
  const nextUntil = Date.now() + ms;
  if (nextUntil > softUntilMs) {
    softUntilMs = nextUntil;
  }
  scheduleSoftRelease();
  notifySoftListeners();
}

/** Solo tests. */
export function resetDualKernelExitSoftForTests(): void {
  if (softTimer) clearTimeout(softTimer);
  softTimer = null;
  softUntilMs = 0;
  moduleSeenOnJ4 = false;
  softListeners.clear();
}

/**
 * True mientras estamos en `/jornada-v4` o en la ventana soft-start tras salir.
 * Usar en motores del App shell y en destinos pesados (Admin, Espejo, Hub Proyectos…).
 */
export function useDualKernelMotorsQuiet(): boolean {
  const [location] = useLocation();
  const onJ4 = isJornada4Path(location);
  const wasOnJ4Ref = useRef(onJ4);
  const soft = useSyncExternalStore(subscribeSoft, getSoftSnapshot, () => false);

  // Latch síncrono en el frame de salida (compartido entre consumidores).
  // Cubre el hueco de 1 frame del #41 y destinos que montan en el mismo commit.
  if (onJ4) {
    moduleSeenOnJ4 = true;
  } else if (moduleSeenOnJ4) {
    moduleSeenOnJ4 = false;
    if (!isDualKernelExitSoftActive()) {
      const ms = isAppShellQuietPath(location)
        ? DUAL_KERNEL_HUB_EXIT_SOFT_MS
        : DUAL_KERNEL_EXIT_SOFT_MS;
      softUntilMs = Date.now() + ms;
    }
  }

  // Timer + notify fuera del render (nav programática / Strict Mode).
  useLayoutEffect(() => {
    const wasOnJ4 = wasOnJ4Ref.current;
    wasOnJ4Ref.current = onJ4;
    if (onJ4) return;
    if (!wasOnJ4 && !isDualKernelExitSoftActive()) return;
    if (isDualKernelExitSoftActive()) {
      scheduleSoftRelease();
    } else if (wasOnJ4) {
      armDualKernelExitSoftStart({ href: location });
    }
  }, [onJ4, location]);

  return onJ4 || soft || isDualKernelExitSoftActive();
}

/**
 * True en Dual Kernel, soft-start de salida, O mientras estamos en Hub Proyectos
 * o Centro de Comando (`/menu`).
 * Usar SOLO en motores del App shell (Centinela / SegmentAttention / Cierre).
 * No usar en la página Hub/Menú: ahí el soft-start corto basta para diferir Firestore propio.
 *
 * Motivo: con ring activo, al soltar soft-start el reloj/Centinela saturan el hilo
 * y los toques (abrir detalle / tarjetas del menú) no llegan a pintar —
 * #50/#51/#52 callaron Hub Proyectos; `/menu` tenía el mismo hueco.
 */
export function useAppShellMotorsQuiet(): boolean {
  const [location] = useLocation();
  const dualQuiet = useDualKernelMotorsQuiet();
  return dualQuiet || isAppShellQuietPath(location);
}
