import { capituloPreparable } from "./canon.ts";
import { diaLima } from "./motor.ts";
import type { CapituloId, LibroGimnasio } from "./types.ts";

export interface Pildora {
  capitulo: CapituloId;
  nombre: string;
  promesa: string;
}

/** Catálogo de la farmacia del gimnasio: una píldora por código (cuarto de 4×3). */
export const PILDORAS: Pildora[] = [
  {
    capitulo: 1,
    nombre: "Recupera tu seguridad en tu producto",
    promesa: "Confianza e identidad frente a lo que vendes y a lo que eres.",
  },
  {
    capitulo: 2,
    nombre: "Vence la crítica social ante tu propósito u oficio",
    promesa: "Sostente cuando alguien te ve desde arriba y te cuestiona.",
  },
];

export type EstadoPildora = "disponible" | "en_curso" | "completada";

export function pildoraDe(capitulo: CapituloId): Pildora | undefined {
  return PILDORAS.find((p) => p.capitulo === capitulo);
}

/** Capítulo con progreso a medias (pasado el primer paso), si lo hay. */
export function pildoraEnCurso(
  libro: Pick<LibroGimnasio, "estado" | "puntero">,
): CapituloId | null {
  if (libro.estado !== "ABIERTO") return null;
  const { capitulo, subcodigo, indice, variante } = libro.puntero;
  const intacto = subcodigo === 1 && indice === 1 && variante === 0;
  return intacto ? null : capitulo;
}

export function estadoPildora(libro: LibroGimnasio, capitulo: CapituloId): EstadoPildora {
  if (pildoraEnCurso(libro) === capitulo) return "en_curso";
  return libro.capitulosSellados.includes(capitulo) ? "completada" : "disponible";
}

export type BloqueoPildora = "en_curso_otra" | "tope_diario" | null;

export function bloqueoPildora(
  libro: LibroGimnasio,
  capitulo: CapituloId,
  now: Date | string = new Date(),
): BloqueoPildora {
  const enCurso = pildoraEnCurso(libro);
  if (enCurso != null) return enCurso === capitulo ? null : "en_curso_otra";
  if (libro.estado === "ABIERTO") return null;
  if (libro.capituloSelladoDia && diaLima(now) === libro.capituloSelladoDia) return "tope_diario";
  return null;
}

export function puedeElegirPildora(
  libro: LibroGimnasio,
  capitulo: CapituloId,
  now: Date | string = new Date(),
): boolean {
  return capituloPreparable(capitulo) && bloqueoPildora(libro, capitulo, now) === null;
}

export function elegirPildora(
  libro: LibroGimnasio,
  capitulo: CapituloId,
  now: Date | string = new Date(),
): LibroGimnasio {
  if (!puedeElegirPildora(libro, capitulo, now)) return libro;
  if (pildoraEnCurso(libro) === capitulo) return libro;
  const iso = (typeof now === "string" ? new Date(now) : now).toISOString();
  return {
    ...libro,
    estado: "ABIERTO",
    puntero: { capitulo, subcodigo: 1, indice: 1, variante: 0 },
    updatedAt: iso,
  };
}
