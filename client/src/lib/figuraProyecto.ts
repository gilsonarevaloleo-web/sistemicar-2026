/**
 * Figura del nido (Norte).
 *
 * Conquista da masa. Enfoque-situacional da forma. Presencia no toca el cuerpo.
 * Un paquete de 10 envíos de forma revela un miembro. La figura no pide comida:
 * muestra lo ya enviado al timón. El hueco es del operador.
 */
import { resolveProyectoEtiqueta, type ProyectoEtiqueta } from "./nidoNaturaleza";
import type { DestinoGasto } from "./gastoTiempo";

export const FIGURA_PAQUETE = 10;
export const FIGURA_MIEMBROS_MAX = 6;

export type FiguraTejido = "forma" | "masa" | "registro";
export type FiguraDeformacion = "ninguna" | "hinchada" | "hueca";
export type FiguraModo = "crecimiento" | "control" | "consciencia";

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
  enviosForma: number;
  enviosMasa: number;
  enviosRegistro: number;
  paquetesForma: number;
  paquetesMasa: number;
  miembrosRevelados: number;
  masaFill: number;
  deformacion: FiguraDeformacion;
  figuraCompleta: boolean;
  hueco: FiguraHueco;
  miembros: FiguraMiembro[];
  copy: string;
  copyHueco: string;
};

export const FIGURA_MIEMBROS_CRECIMIENTO: readonly { id: string; label: string }[] = [
  { id: "torso", label: "torso" },
  { id: "cabeza", label: "cabeza" },
  { id: "brazoI", label: "brazo izquierdo" },
  { id: "brazoD", label: "brazo derecho" },
  { id: "piernaI", label: "pierna izquierda" },
  { id: "piernaD", label: "pierna derecha" },
];

export const FIGURA_ANILLOS_CONTROL: readonly { id: string; label: string }[] = [
  { id: "s1", label: "cimiento" },
  { id: "s2", label: "segundo anillo" },
  { id: "s3", label: "tercer anillo" },
  { id: "s4", label: "cuarto anillo" },
  { id: "s5", label: "quinto anillo" },
  { id: "s6", label: "cumbre" },
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
 * cubre el día y no toca la figura.
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
  const cap = Math.min(FIGURA_MIEMBROS_MAX, catalogo.length);
  const n = Math.max(0, Math.min(cap, revelados));
  return catalogo.slice(0, cap).map((m, i) => ({
    id: m.id,
    label: m.label,
    revelado: i < n,
    esSiguiente: i === n,
  }));
}

function deformacionDe(paquetesForma: number, paquetesMasa: number): FiguraDeformacion {
  if (paquetesMasa > paquetesForma) return "hinchada";
  if (paquetesForma > paquetesMasa && paquetesForma > 0) return "hueca";
  return "ninguna";
}

function masaFillDe(enviosMasa: number, miembrosRevelados: number): number {
  if (miembrosRevelados <= 0) return 0;
  const cupo = miembrosRevelados * FIGURA_PAQUETE;
  return Math.max(0, Math.min(1, enviosMasa / cupo));
}

function copyFigura(estado: Omit<FiguraEstado, "copy" | "copyHueco">): {
  copy: string;
  copyHueco: string;
} {
  if (estado.modo === "consciencia") {
    if (estado.enviosRegistro <= 0) {
      return {
        copy: "Se registra. No trepa. Diez envíos de rumbo encienden el brillo.",
        copyHueco: `${estado.hueco.enPaquete} de ${FIGURA_PAQUETE} para el primer brillo.`,
      };
    }
    const nivel = Math.min(FIGURA_MIEMBROS_MAX, estado.paquetesForma);
    if (nivel >= FIGURA_MIEMBROS_MAX) {
      return {
        copy: "El registro ya se ve. No pide miembros ni escalera.",
        copyHueco: "Se registra. No trepa.",
      };
    }
    return {
      copy: "Información, no figura. El brillo crece sin trepar.",
      copyHueco: `${estado.hueco.enPaquete} de ${FIGURA_PAQUETE} para más brillo.`,
    };
  }

  const pieza = estado.modo === "control" ? "anillo" : "miembro";
  if (estado.enviosForma <= 0 && estado.enviosMasa <= 0) {
    return {
      copy:
        estado.modo === "control"
          ? "Todavía no hay sostén. Diez envíos de enfoque revelan un anillo. La conquista da peso, no contorno."
          : "Todavía no hay forma. Diez envíos de enfoque revelan un miembro. La conquista da peso, no contorno.",
      copyHueco: estado.hueco.siguiente
        ? `${estado.hueco.enPaquete} de ${FIGURA_PAQUETE} para revelar el ${estado.hueco.siguiente.label}.`
        : `${estado.hueco.enPaquete} de ${FIGURA_PAQUETE} para el primer ${pieza}.`,
    };
  }

  if (estado.deformacion === "hinchada" && estado.miembrosRevelados === 0) {
    return {
      copy: "Hay peso sin contorno. La masa no revela figura.",
      copyHueco: estado.hueco.siguiente
        ? `${estado.hueco.enPaquete} de ${FIGURA_PAQUETE} para revelar el ${estado.hueco.siguiente.label}.`
        : `${estado.hueco.enPaquete} de ${FIGURA_PAQUETE} para el primer ${pieza}.`,
    };
  }

  if (estado.figuraCompleta) {
    if (estado.deformacion === "hueca") {
      return {
        copy: "La figura ya tiene cara, pero sigue hueca. La conquista da el peso que falta.",
        copyHueco: `${estado.hueco.enPaquete} de ${FIGURA_PAQUETE} para dar masa.`,
      };
    }
    if (estado.deformacion === "hinchada") {
      return {
        copy: "La figura ya se ve. El exceso de masa la hincha: el contorno no crece con el peso.",
        copyHueco: "La forma ya está. El peso extra no abre otro miembro.",
      };
    }
    return {
      copy: "La figura ya se ve. El propósito puede nacer de lo que ya tiene cara.",
      copyHueco: "Sin hueco de forma. La masa puede seguir dando peso.",
    };
  }

  if (estado.deformacion === "hueca") {
    return {
      copy: `El ${estado.hueco.siguiente ? "contorno" : pieza} ya se ve. Sin masa queda hueco.`,
      copyHueco: estado.hueco.siguiente
        ? `${estado.hueco.enPaquete} de ${FIGURA_PAQUETE} para revelar el ${estado.hueco.siguiente.label}.`
        : `${estado.hueco.enPaquete} de ${FIGURA_PAQUETE} para dar masa.`,
    };
  }

  const next = estado.hueco.siguiente;
  return {
    copy:
      estado.modo === "control"
        ? "El sostén aparece por anillos. La conquista lo carga; el enfoque lo dibuja."
        : "La forma aparece por paquetes. La conquista da peso; el enfoque da contorno.",
    copyHueco: next
      ? `${estado.hueco.enPaquete} de ${FIGURA_PAQUETE} para revelar el ${next.label}.`
      : `${estado.hueco.enPaquete} de ${FIGURA_PAQUETE} para el siguiente ${pieza}.`,
  };
}

export function computeFiguraEstado(
  etiqueta: ProyectoEtiqueta | string | null | undefined,
  stamps: FiguraStamp[]
): FiguraEstado {
  const modo = figuraModoDeEtiqueta(etiqueta);
  const enviosForma = stamps.filter(s => s.tipoOrigen === "situacion").length;
  const enviosMasa = stamps.filter(s => s.tipoOrigen === "tiempo").length;
  const enviosRegistro = modo === "consciencia" ? stamps.length : enviosForma + enviosMasa;
  const formaParaPaquetes = modo === "consciencia" ? enviosRegistro : enviosForma;
  const paquetesForma = Math.floor(formaParaPaquetes / FIGURA_PAQUETE);
  const paquetesMasa = Math.floor(enviosMasa / FIGURA_PAQUETE);
  const catalogo = catalogoMiembros(modo);
  const miembrosRevelados =
    modo === "consciencia" ? 0 : Math.min(FIGURA_MIEMBROS_MAX, paquetesForma);
  const miembros =
    modo === "consciencia" ? [] : buildMiembros(catalogo, miembrosRevelados);
  const figuraCompleta =
    modo !== "consciencia" && miembrosRevelados >= FIGURA_MIEMBROS_MAX;
  const deformacion =
    modo === "consciencia" ? "ninguna" : deformacionDe(paquetesForma, paquetesMasa);

  let hueco: FiguraHueco;
  if (modo === "consciencia") {
    hueco = {
      tejido: "registro",
      enPaquete: restoPaquete(enviosRegistro),
      paquete: FIGURA_PAQUETE,
      siguiente: null,
    };
  } else if (!figuraCompleta) {
    hueco = {
      tejido: "forma",
      enPaquete: restoPaquete(enviosForma),
      paquete: FIGURA_PAQUETE,
      siguiente: miembros.find(m => m.esSiguiente) ?? null,
    };
  } else {
    hueco = {
      tejido: "masa",
      enPaquete: restoPaquete(enviosMasa),
      paquete: FIGURA_PAQUETE,
      siguiente: null,
    };
  }

  const base: Omit<FiguraEstado, "copy" | "copyHueco"> = {
    modo,
    enviosForma,
    enviosMasa,
    enviosRegistro,
    paquetesForma,
    paquetesMasa,
    miembrosRevelados,
    masaFill: masaFillDe(enviosMasa, miembrosRevelados),
    deformacion,
    figuraCompleta,
    hueco,
    miembros,
  };
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
  return `forma ${estado.enviosForma} · masa ${estado.enviosMasa}`;
}
