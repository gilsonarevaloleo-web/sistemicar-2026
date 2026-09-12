/**
 * Red del nido (Norte).
 *
 * Cada envío de Dirección es una conexión. Diez hacen un haz: aparece un
 * ganglio. Conquista mieliniza (grosor). Enfoque abre ramas (topología).
 * Presencia no toca la red. El cuerpo es el primer núcleo; después la red
 * sale hacia casa y hacia otros. La figura no pide comida: muestra lo ya
 * enviado al timón.
 */
import { resolveProyectoEtiqueta, type ProyectoEtiqueta } from "./nidoNaturaleza";
import type { DestinoGasto } from "./gastoTiempo";

export const FIGURA_PAQUETE = 10;
export const FIGURA_CUERPO_MAX = 6;
export const FIGURA_HAZ_RED = 12;
export const FIGURA_HAZ_CASA = 18;

export type FiguraTejido = "conexion" | "registro";
export type FiguraDeformacion = "ninguna" | "mielina" | "ramas";
export type FiguraModo = "crecimiento" | "control" | "consciencia";
export type FiguraCapa = "semilla" | "cuerpo" | "red" | "casa" | "linaje";

export type FiguraMiembro = {
  id: string;
  label: string;
  revelado: boolean;
  esSiguiente: boolean;
};

export type FiguraHueco = {
  tejido: FiguraTejido;
  enPaquete: number;
  paquete: number;
  siguiente: FiguraMiembro | null;
};

export type FiguraStamp = {
  vehicleId: string;
  tipoOrigen: "tiempo" | "situacion";
};

export type FiguraTimonLike = {
  vehiculos?: Array<{
    vehicleId?: string;
    tipoOrigen?: "tiempo" | "situacion";
  }> | null;
};

export type FiguraPeldanoLike = {
  timonEpisodio?: FiguraTimonLike | null;
  timonCerrados?: FiguraTimonLike[] | null;
  resumen?: {
    timon?: {
      vehiculos?: Array<{
        vehicleId?: string;
        tipoOrigen?: "tiempo" | "situacion";
      }> | null;
    } | null;
  } | null;
};

export type FiguraGastoLike = {
  sellos?: Array<{
    vid?: string;
    dest?: DestinoGasto | string;
  }> | null;
};

export type FiguraEstado = {
  modo: FiguraModo;
  capa: FiguraCapa;
  enviosForma: number;
  enviosMasa: number;
  enviosRegistro: number;
  conexiones: number;
  haces: number;
  paquetesForma: number;
  paquetesMasa: number;
  miembrosRevelados: number;
  masaFill: number;
  mielina: number;
  casaRevelada: boolean;
  linajeRevelados: number;
  deformacion: FiguraDeformacion;
  cuerpoCableado: boolean;
  hueco: FiguraHueco;
  miembros: FiguraMiembro[];
  copy: string;
  copyHueco: string;
};

export const FIGURA_MIEMBROS_CRECIMIENTO: readonly { id: string; label: string }[] = [
  { id: "torso", label: "el torso" },
  { id: "cabeza", label: "la cabeza" },
  { id: "brazoI", label: "el brazo izquierdo" },
  { id: "brazoD", label: "el brazo derecho" },
  { id: "piernaI", label: "la pierna izquierda" },
  { id: "piernaD", label: "la pierna derecha" },
];

export const FIGURA_ANILLOS_CONTROL: readonly { id: string; label: string }[] = [
  { id: "s1", label: "el cimiento" },
  { id: "s2", label: "el segundo anillo" },
  { id: "s3", label: "el tercer anillo" },
  { id: "s4", label: "el cuarto anillo" },
  { id: "s5", label: "el quinto anillo" },
  { id: "s6", label: "la cumbre" },
];

export const FIGURA_MAS_ALLA: readonly { id: string; label: string }[] = [
  { id: "malla", label: "la malla" },
  { id: "casa", label: "la casa" },
  { id: "otro", label: "otro" },
];

export function figuraModoDeEtiqueta(etiqueta?: string | null): FiguraModo {
  const kind = resolveProyectoEtiqueta(etiqueta);
  if (kind === "centro") return "control";
  if (kind === "consciencia") return "consciencia";
  return "crecimiento";
}

export function catalogoMiembros(modo: FiguraModo): readonly { id: string; label: string }[] {
  if (modo === "control") return FIGURA_ANILLOS_CONTROL;
  return FIGURA_MIEMBROS_CRECIMIENTO;
}

export function figuraCapaDeHaces(haces: number): FiguraCapa {
  if (haces <= 0) return "semilla";
  if (haces < FIGURA_CUERPO_MAX) return "cuerpo";
  if (haces < FIGURA_HAZ_RED) return "red";
  if (haces < FIGURA_HAZ_CASA) return "casa";
  return "linaje";
}

function pushTimonStamps(
  map: Map<string, FiguraStamp>,
  timon: FiguraTimonLike | null | undefined
): void {
  if (!timon?.vehiculos) return;
  for (const v of timon.vehiculos) {
    const id = v.vehicleId?.trim();
    if (!id || map.has(id)) continue;
    const tipo = v.tipoOrigen === "situacion" ? "situacion" : "tiempo";
    map.set(id, { vehicleId: id, tipoOrigen: tipo });
  }
}

/**
 * Recoge envíos de Dirección. Presencia se ignora a propósito:
 * cubre el día y no toca la red.
 */
export function collectFiguraStamps(input: {
  peldanos?: FiguraPeldanoLike[] | null;
  liveTimon?: FiguraTimonLike | null;
  gasto?: FiguraGastoLike | null;
  /** Excluido. El parámetro documenta la regla: presencia no alimenta. */
  presenciaEpisodio?: FiguraTimonLike | null;
}): FiguraStamp[] {
  const map = new Map<string, FiguraStamp>();
  pushTimonStamps(map, input.liveTimon);
  for (const pel of input.peldanos ?? []) {
    pushTimonStamps(map, pel.timonEpisodio);
    for (const cerrado of pel.timonCerrados ?? []) {
      pushTimonStamps(map, cerrado);
    }
    const resumenVeh = pel.resumen?.timon?.vehiculos;
    if (resumenVeh) {
      pushTimonStamps(map, { vehiculos: resumenVeh });
    }
  }
  for (const sello of input.gasto?.sellos ?? []) {
    if (sello.dest !== "direccion") continue;
    const id = sello.vid?.trim();
    if (!id || map.has(id)) continue;
    map.set(id, { vehicleId: id, tipoOrigen: "situacion" });
  }
  void input.presenciaEpisodio;
  return [...map.values()];
}

function restoPaquete(n: number): number {
  return ((n % FIGURA_PAQUETE) + FIGURA_PAQUETE) % FIGURA_PAQUETE;
}

function buildMiembros(
  catalogo: readonly { id: string; label: string }[],
  revelados: number
): FiguraMiembro[] {
  const cap = Math.min(FIGURA_CUERPO_MAX, catalogo.length);
  const n = Math.max(0, Math.min(cap, revelados));
  return catalogo.slice(0, cap).map((m, i) => ({
    id: m.id,
    label: m.label,
    revelado: i < n,
    esSiguiente: i === n,
  }));
}

function deformacionDe(enviosForma: number, enviosMasa: number, conexiones: number): FiguraDeformacion {
  if (conexiones < FIGURA_PAQUETE) return "ninguna";
  if (enviosMasa > enviosForma * 2 && enviosMasa >= FIGURA_PAQUETE) return "mielina";
  if (enviosForma > enviosMasa * 2 && enviosForma >= FIGURA_PAQUETE) return "ramas";
  return "ninguna";
}

function masaFillDe(enviosMasa: number, miembrosRevelados: number): number {
  if (miembrosRevelados <= 0) return 0;
  const cupo = miembrosRevelados * FIGURA_PAQUETE;
  return Math.max(0, Math.min(1, enviosMasa / cupo));
}

function siguienteMasAlla(capa: FiguraCapa): FiguraMiembro | null {
  if (capa === "cuerpo" || capa === "semilla") return null;
  if (capa === "red") {
    return { id: "malla", label: FIGURA_MAS_ALLA[0]!.label, revelado: true, esSiguiente: true };
  }
  if (capa === "casa") {
    return { id: "casa", label: FIGURA_MAS_ALLA[1]!.label, revelado: false, esSiguiente: true };
  }
  return { id: "otro", label: FIGURA_MAS_ALLA[2]!.label, revelado: false, esSiguiente: true };
}

function copyFigura(estado: Omit<FiguraEstado, "copy" | "copyHueco">): {
  copy: string;
  copyHueco: string;
} {
  const pack = `${estado.hueco.enPaquete} de ${FIGURA_PAQUETE}`;
  if (estado.modo === "consciencia") {
    if (estado.enviosRegistro <= 0) {
      return {
        copy: "Se registra. No trepa. Diez envíos de rumbo encienden el brillo.",
        copyHueco: `${pack} para el primer brillo.`,
      };
    }
    return {
      copy: "Información, no red. El brillo crece sin trepar.",
      copyHueco: `${pack} para más brillo.`,
    };
  }

  const pieza = estado.modo === "control" ? "anillo" : "ganglio";
  if (estado.conexiones <= 0) {
    return {
      copy:
        estado.modo === "control"
          ? "Cada envío de Dirección es una conexión. Diez hacen un haz: aparece un anillo."
          : "Cada envío de Dirección es una conexión. Diez hacen un haz: aparece un ganglio. El cuerpo es el primer núcleo.",
      copyHueco: estado.hueco.siguiente
        ? `${pack} para revelar ${estado.hueco.siguiente.label}.`
        : `${pack} para el primer ${pieza}.`,
    };
  }

  if (estado.capa === "linaje") {
    return {
      copy: "De la casa salen otros. Cada haz nuevo es alguien — o algo — que la red sostiene.",
      copyHueco: `${pack} para revelar otro.`,
    };
  }
  if (estado.capa === "casa") {
    return {
      copy: "El cuerpo ya está cableado. La red busca casa: un lugar que el proyecto resguarda.",
      copyHueco: estado.casaRevelada
        ? `${pack} para densificar la casa.`
        : `${pack} para revelar la casa.`,
    };
  }
  if (estado.capa === "red") {
    return {
      copy: "Los ganglios ya se tocan. La repetición mieliniza; el enfoque abre ramas entre ellos.",
      copyHueco: `${pack} para densificar la malla.`,
    };
  }

  const next = estado.hueco.siguiente;
  if (estado.deformacion === "mielina") {
    return {
      copy: "La ejecución ya cableó ganglios. La mielina los hace más gruesos; el enfoque les dará ramas.",
      copyHueco: next
        ? `${pack} para revelar ${next.label}.`
        : `${pack} para el siguiente ${pieza}.`,
    };
  }
  if (estado.deformacion === "ramas") {
    return {
      copy: "Hay ramas nuevas. Sin repetición quedan finas: la conquista las mieliniza.",
      copyHueco: next
        ? `${pack} para revelar ${next.label}.`
        : `${pack} para el siguiente ${pieza}.`,
    };
  }
  return {
    copy:
      estado.modo === "control"
        ? "El sostén aparece por haces. Toda la producción cuenta: conquista y enfoque."
        : "La red crece por haces. Toda la producción cuenta: conquista y enfoque.",
    copyHueco: next
      ? `${pack} para revelar ${next.label}.`
      : `${pack} para el siguiente ${pieza}.`,
  };
}

export function computeFiguraEstado(
  etiqueta: ProyectoEtiqueta | string | null | undefined,
  stamps: FiguraStamp[]
): FiguraEstado {
  const modo = figuraModoDeEtiqueta(etiqueta);
  const enviosForma = stamps.filter(s => s.tipoOrigen === "situacion").length;
  const enviosMasa = stamps.filter(s => s.tipoOrigen === "tiempo").length;
  const conexiones = enviosForma + enviosMasa;
  const enviosRegistro = modo === "consciencia" ? stamps.length : conexiones;
  const paraHaces = modo === "consciencia" ? enviosRegistro : conexiones;
  const haces = Math.floor(paraHaces / FIGURA_PAQUETE);
  const paquetesForma = Math.floor(enviosForma / FIGURA_PAQUETE);
  const paquetesMasa = Math.floor(enviosMasa / FIGURA_PAQUETE);
  const capa = modo === "consciencia" ? "semilla" : figuraCapaDeHaces(haces);
  const catalogo = catalogoMiembros(modo);
  const miembrosRevelados =
    modo === "consciencia" ? 0 : Math.min(FIGURA_CUERPO_MAX, haces);
  const miembros =
    modo === "consciencia" ? [] : buildMiembros(catalogo, miembrosRevelados);
  const cuerpoCableado = modo !== "consciencia" && miembrosRevelados >= FIGURA_CUERPO_MAX;
  const casaRevelada = modo !== "consciencia" && haces >= FIGURA_HAZ_RED;
  const linajeRevelados =
    modo === "consciencia" ? 0 : Math.max(0, haces - FIGURA_HAZ_CASA);
  const deformacion =
    modo === "consciencia" ? "ninguna" : deformacionDe(enviosForma, enviosMasa, conexiones);

  let hueco: FiguraHueco;
  if (modo === "consciencia") {
    hueco = {
      tejido: "registro",
      enPaquete: restoPaquete(enviosRegistro),
      paquete: FIGURA_PAQUETE,
      siguiente: null,
    };
  } else if (!cuerpoCableado) {
    hueco = {
      tejido: "conexion",
      enPaquete: restoPaquete(conexiones),
      paquete: FIGURA_PAQUETE,
      siguiente: miembros.find(m => m.esSiguiente) ?? null,
    };
  } else {
    hueco = {
      tejido: "conexion",
      enPaquete: restoPaquete(conexiones),
      paquete: FIGURA_PAQUETE,
      siguiente: siguienteMasAlla(capa),
    };
  }

  const base: Omit<FiguraEstado, "copy" | "copyHueco"> = {
    modo,
    capa,
    enviosForma,
    enviosMasa,
    enviosRegistro,
    conexiones,
    haces,
    paquetesForma,
    paquetesMasa,
    miembrosRevelados,
    masaFill: masaFillDe(enviosMasa, Math.max(miembrosRevelados, 1)),
    mielina: conexiones <= 0 ? 0 : Math.max(0, Math.min(1, enviosMasa / conexiones)),
    casaRevelada,
    linajeRevelados,
    deformacion,
    cuerpoCableado,
    hueco,
    miembros,
  };
  if (modo !== "consciencia" && miembrosRevelados === 0) {
    base.masaFill = 0;
  }
  const texts = copyFigura(base);
  return { ...base, ...texts };
}

export function computeFiguraDesdeNido(input: {
  etiqueta?: ProyectoEtiqueta | string | null;
  peldanos?: FiguraPeldanoLike[] | null;
  liveTimon?: FiguraTimonLike | null;
  gasto?: FiguraGastoLike | null;
  presenciaEpisodio?: FiguraTimonLike | null;
}): FiguraEstado {
  const stamps = collectFiguraStamps(input);
  return computeFiguraEstado(input.etiqueta, stamps);
}

export function figuraProgresoLabel(estado: FiguraEstado): string {
  if (estado.modo === "consciencia") {
    return `registro ${estado.enviosRegistro}`;
  }
  return `${estado.conexiones} conexiones · ${estado.haces} haces`;
}

export function figuraCapaLabel(capa: FiguraCapa): string {
  if (capa === "linaje") return "Linaje";
  if (capa === "casa") return "Casa";
  if (capa === "red") return "Malla";
  if (capa === "cuerpo") return "Cuerpo";
  return "Red";
}
