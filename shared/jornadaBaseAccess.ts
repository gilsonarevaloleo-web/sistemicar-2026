/**
 * Acceso a Jornada Base: pago, trial de 7 días, o gancho de 500 PS.
 * Fuente canónica del “entra gente” comercial.
 */

import {
  hasModule,
  isOwnerEmail,
  type ModuleAccessInput,
} from "./moduleAccess.ts";

export const JORNADA_BASE_TRIAL_DAYS = 7;
export const JORNADA_BASE_POINTS_UNLOCK = 500;
export const JORNADA_BASE_TRIAL_MS =
  JORNADA_BASE_TRIAL_DAYS * 24 * 60 * 60 * 1000;

export const JORNADA_BASE_TRIAL_HREF = "/jornada-v4";
export const JORNADA_BASE_TRIAL_ACCESO_HREF = "/acceso?next=/jornada-v4";

export const JORNADA_BASE_TRIAL_COPY = {
  days: JORNADA_BASE_TRIAL_DAYS,
  pointsUnlock: JORNADA_BASE_POINTS_UNLOCK,
  headline: "7 días gratis",
  after: "Después $24.99/mes",
  hook: "Llega a 500 PS y Jornada Base te queda gratis.",
  short: "7 días gratis. Después $24.99/mes. 500 PS = Base gratis.",
  voice:
    "Siete días gratis. Después veinticinco al mes. Si llegas a quinientos puntos, te queda gratis.",
} as const;

export type JornadaBaseAccessKind =
  | "owner"
  | "paid"
  | "points"
  | "trial"
  | "eligible_trial"
  | "expired"
  | "none";

export type JornadaBaseAccess = {
  allowed: boolean;
  kind: JornadaBaseAccessKind;
  daysLeft?: number;
  points: number;
  pointsRemaining: number;
  trialEndsAt?: number;
};

export type JornadaBaseAccessInput = ModuleAccessInput & {
  sovereigntyPoints?: number | null;
  jornadaBaseTrialStartedAt?: unknown;
  jornadaBaseEarnedFree?: boolean | null;
};

export function toEpochMs(value: unknown): number | null {
  if (value == null || value === false) return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && asNum > 1_000_000) return asNum;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (
    typeof value === "object" &&
    value &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    const ms = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function daysLeftFrom(startedAt: number, now: number): number {
  const remaining = startedAt + JORNADA_BASE_TRIAL_MS - now;
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

export function resolveJornadaBaseAccess(
  input: JornadaBaseAccessInput,
  now = Date.now(),
): JornadaBaseAccess {
  const points = Math.max(0, Math.round(Number(input.sovereigntyPoints) || 0));
  const pointsRemaining = Math.max(0, JORNADA_BASE_POINTS_UNLOCK - points);
  const base = { points, pointsRemaining };

  if (isOwnerEmail(input.email)) {
    return { ...base, allowed: true, kind: "owner" };
  }

  if (hasModule(input, "planificacion_base")) {
    return { ...base, allowed: true, kind: "paid" };
  }

  if (input.jornadaBaseEarnedFree || points >= JORNADA_BASE_POINTS_UNLOCK) {
    return { ...base, allowed: true, kind: "points", pointsRemaining: 0 };
  }

  const startedAt = toEpochMs(input.jornadaBaseTrialStartedAt);
  if (startedAt != null) {
    const endsAt = startedAt + JORNADA_BASE_TRIAL_MS;
    if (now < endsAt) {
      return {
        ...base,
        allowed: true,
        kind: "trial",
        daysLeft: daysLeftFrom(startedAt, now),
        trialEndsAt: endsAt,
      };
    }
    return { ...base, allowed: false, kind: "expired", trialEndsAt: endsAt };
  }

  return { ...base, allowed: false, kind: "eligible_trial" };
}

/** Puede entrar a Jornada (pago, trial activo, 500 PS, o aún no usó el trial). */
export function canEnterJornadaBase(
  input: JornadaBaseAccessInput,
  now = Date.now(),
): boolean {
  const access = resolveJornadaBaseAccess(input, now);
  return access.allowed || access.kind === "eligible_trial";
}

export function jornadaBaseAccessFromProgression(
  input: JornadaBaseAccessInput,
  now = Date.now(),
): JornadaBaseAccess {
  return resolveJornadaBaseAccess(input, now);
}

export function trialBannerText(access: JornadaBaseAccess): string | null {
  if (access.kind === "trial") {
    const dias = access.daysLeft ?? 0;
    const diaLabel = dias === 1 ? "1 día" : `${dias} días`;
    return `${diaLabel} de prueba · ${access.points}/${JORNADA_BASE_POINTS_UNLOCK} PS para dejar Base gratis`;
  }
  if (access.kind === "points") {
    return "Base gratis: llegaste a 500 PS.";
  }
  return null;
}
