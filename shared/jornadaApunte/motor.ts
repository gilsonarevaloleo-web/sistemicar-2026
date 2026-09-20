import { APUNTE_MAX_LEN, type JornadaApunte, type JornadaApunteCierre } from "./types.ts";

export function normalizeFrase(raw: string): string {
  return (raw ?? "").replace(/\s+/g, " ").trim();
}

export function fraseValida(raw: string): boolean {
  const frase = normalizeFrase(raw);
  return frase.length > 0 && frase.length <= APUNTE_MAX_LEN;
}

export function isApuntado(apunte: JornadaApunte | null | undefined): boolean {
  return Boolean(apunte && fraseValida(apunte.blanco) && apunte.apuntadoAt > 0);
}

export function isCerrado(apunte: JornadaApunte | null | undefined): boolean {
  return Boolean(
    isApuntado(apunte) &&
      apunte &&
      fraseValida(apunte.ocurrio ?? "") &&
      fraseValida(apunte.noOcurrio ?? "") &&
      (apunte.cerradoAt ?? 0) > 0,
  );
}

export function crearApunte(fecha: string, blanco: string, nowMs: number): JornadaApunte {
  const frase = normalizeFrase(blanco);
  if (!fraseValida(frase)) {
    throw new Error("Hoy apunto a esto: una frase, no un vacío.");
  }
  if (!fecha) {
    throw new Error("El apunte necesita fecha de jornada.");
  }
  return {
    fecha,
    blanco: frase,
    apuntadoAt: nowMs,
  };
}

export function cerrarApunte(
  apunte: JornadaApunte,
  ocurrio: string,
  noOcurrio: string,
  nowMs: number,
): JornadaApunte {
  if (!isApuntado(apunte)) {
    throw new Error("No se cierra un día que no se apuntó.");
  }
  const si = normalizeFrase(ocurrio);
  const no = normalizeFrase(noOcurrio);
  if (!fraseValida(si) || !fraseValida(no)) {
    throw new Error("Esto ocurrió y esto no: las dos frases, no una.");
  }
  return {
    ...apunte,
    ocurrio: si,
    noOcurrio: no,
    cerradoAt: nowMs,
  };
}

export function cierreDesdeApunte(apunte: JornadaApunte): JornadaApunteCierre {
  if (!isCerrado(apunte)) {
    throw new Error("El cierre no está escrito.");
  }
  return {
    blanco: apunte.blanco,
    ocurrio: apunte.ocurrio as string,
    noOcurrio: apunte.noOcurrio as string,
  };
}

/** Hechos humanos primero; los números del sello van después. */
export function hechosDesdeCierre(cierre: JornadaApunteCierre): string[] {
  return [
    `Hoy apunté a: ${cierre.blanco}`,
    `Esto ocurrió: ${cierre.ocurrio}`,
    `Esto no: ${cierre.noOcurrio}`,
  ];
}

export function adjuntarApunteAlCierre<T extends { evidenciaHechos?: string[] }>(
  log: T,
  cierre: JornadaApunteCierre,
): T & {
  apunteBlanco: string;
  apunteOcurrio: string;
  apunteNoOcurrio: string;
} {
  return {
    ...log,
    apunteBlanco: cierre.blanco,
    apunteOcurrio: cierre.ocurrio,
    apunteNoOcurrio: cierre.noOcurrio,
    evidenciaHechos: [...hechosDesdeCierre(cierre), ...(log.evidenciaHechos ?? [])],
  };
}
