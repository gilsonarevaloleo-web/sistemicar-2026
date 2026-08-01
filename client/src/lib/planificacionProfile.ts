import {
  hasNorteAccess,
  hasRitmoAccess,
  type UserProgression,
  type UserRank,
} from "./persistence";
import type { PlanificacionPlanProfile } from "./planificacionOnboarding";

export type { PlanificacionPlanProfile };

export function resolvePlanificacionProfile(
  subscriptionPlan?: string | null,
  email?: string | null,
  rank?: UserRank | null,
  activeModules?: string[] | null
): PlanificacionPlanProfile {
  // Norte (Crisol + Hub) es el perfil más alto.
  if (hasNorteAccess(subscriptionPlan, email, rank, activeModules)) {
    return "norte";
  }
  if (hasRitmoAccess(subscriptionPlan, email, rank, activeModules)) {
    return "ritmo";
  }
  return "base";
}

export function progressionToProfile(
  prog: UserProgression | null,
  email?: string | null
): PlanificacionPlanProfile {
  if (!prog) return "base";
  return resolvePlanificacionProfile(
    prog.subscriptionPlan,
    email,
    prog.rank,
    prog.activeModules
  );
}
