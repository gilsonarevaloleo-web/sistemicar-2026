import { SISTEMICAR_CATEGORY } from "./sistemicarCategory";

/** Recinto vivo de Depósito V3 (Óptica-Sintaxis). */
export const DEPOSITO_V3_PATH = "/esperanza" as const;

/** Recinto de Depósito V2 (Óptica-Código). */
export const DEPOSITO_V2_PATH = "/deposito-v2" as const;

/** Alias históricos — redirigen a V3. */
export const DEPOSITO_ALIAS_PATH = "/deposito" as const;
export const DEPOSITO_V3_ALIAS_PATH = "/deposito-v3" as const;

export const DEPOSITO_COLORS = {
  PIZARRA: "#020202",
  INK: "#f1f5f9",
  MUTED: "#a3a3a3",
  GOLD: "#D4AF37",
  AZURE: "#1E90FF",
} as const;

export const DEPOSITO_MODULE = {
  title: "Depósito",
  titleUpper: "DEPÓSITO",
  tagline: "MÓDULO EL DEPÓSITO · Universidad de un ojo",
  taglineShort: "Universidad · Un ojo",
  productLine: "Universidad",
  ritualV3: "¿Qué aprendí hoy?",
  ritualV2: "Volcá el día. Crudo. El ruido también es ojo.",
  category: SISTEMICAR_CATEGORY,
} as const;

export const DEPOSITO_HINT_V3 =
  "El dictamen es firma + cascada + vacíos. El título es C1. C10 solo abrocha si el cierre vuelve al título. El ajuste enseña el escalón pendiente, no un juicio. V2 queda en su recinto.";

export const DEPOSITO_HINT_V2 =
  "Volcá el día. Crudo. El ruido también es ojo. El Muro nombra uno.";

function pathOnly(pathname: string | null | undefined): string {
  if (!pathname) return "";
  return pathname.split("?")[0] ?? pathname;
}

export function isDepositoV3Path(pathname: string | null | undefined): boolean {
  const path = pathOnly(pathname);
  return (
    path === DEPOSITO_V3_PATH ||
    path.startsWith(`${DEPOSITO_V3_PATH}/`) ||
    path === DEPOSITO_V3_ALIAS_PATH ||
    path.startsWith(`${DEPOSITO_V3_ALIAS_PATH}/`) ||
    path === DEPOSITO_ALIAS_PATH
  );
}

export function isDepositoV2Path(pathname: string | null | undefined): boolean {
  const path = pathOnly(pathname);
  return path === DEPOSITO_V2_PATH || path.startsWith(`${DEPOSITO_V2_PATH}/`);
}

export function isDepositoPath(pathname: string | null | undefined): boolean {
  return isDepositoV3Path(pathname) || isDepositoV2Path(pathname);
}
