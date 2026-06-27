import type { SubVehiculo } from "@/lib/persistence";
import { cleanSubTitulo } from "@/components/flota/vehicleCardShared";
import { computeSubCloseVerdict } from "@/lib/desglosadorClock";
import { computeDesglosadorSubAwardPS, DESGLOSADOR_SUB_CUMPLIDO_PS } from "@/lib/sovereigntyPointsConfig";

const PS_EN_PALABRAS: Record<number, string> = {
  0: "cero",
  1: "uno",
  2: "dos",
  3: "tres",
  4: "cuatro",
  5: "cinco",
  6: "seis",
  7: "siete",
  8: "ocho",
  9: "nueve",
  10: "diez",
  11: "once",
  12: "doce",
};

export function psCantidadEnPalabras(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "cero";
  if (PS_EN_PALABRAS[n]) return PS_EN_PALABRAS[n];
  return String(Math.round(n));
}

function psGanadosFrase(n: number): string {
  if (n <= 0) return "";
  const palabra = psCantidadEnPalabras(n);
  const etiqueta = n === 1 ? "punto de soberanía ganado" : "puntos de soberanía ganados";
  return `Más ${palabra} ${etiqueta}.`;
}

/** Cierre de sub desglosador tiempo (cumplido / fallado). */
export function buildDesglosadorSubClosePhrases(
  sub: SubVehiculo,
  status: "cumplido" | "fallado"
): string[] {
  const titulo = cleanSubTitulo(sub.titulo);
  if (status === "fallado") {
    return [
      titulo ? `Tarea fallada: ${titulo}.` : "Tarea fallada.",
      "Sin puntos de soberanía en esta fila.",
    ];
  }

  const ps = computeDesglosadorSubAwardPS(sub);
  const phrases = [
    titulo ? `Tarea cumplida: ${titulo}.` : "Tarea cumplida.",
    psGanadosFrase(ps),
  ].filter(Boolean);

  const verdict = computeSubCloseVerdict(sub).verdict;
  if (verdict === "gain") {
    phrases.push("Por debajo de tu referencia. Tiempo ganado.");
  } else if (verdict === "loss") {
    phrases.push("Por encima de tu referencia. Calibra el próximo bloque.");
  }

  if (ps > DESGLOSADOR_SUB_CUMPLIDO_PS) {
    phrases.push("Privilegio de ruta de enfoque aplicado.");
  }

  return phrases.filter(Boolean);
}

/** Cierre de fila en ring situacional (cronómetro). */
export function buildSituacionFilaClosePhrases(
  texto: string,
  status: "cumplido" | "fallado",
  opts?: { psBase?: number; depthDelta?: number; minutosGanados?: number }
): string[] {
  const fila = texto.trim() || "Fila del ring";
  if (status === "fallado") {
    return [`Fila fallada: ${fila}.`, "Sin puntos de soberanía en esta fila."];
  }

  const phrases = [`Fila cumplida: ${fila}.`];
  const psBase = opts?.psBase ?? 4;
  const psFrase = psGanadosFrase(psBase);
  if (psFrase) phrases.push(psFrase);

  if (opts?.depthDelta && opts.depthDelta > 0) {
    phrases.push(`Profundidad de bloque. ${psGanadosFrase(opts.depthDelta)}`.trim());
  } else if (opts?.minutosGanados && opts.minutosGanados > 0) {
    const min = psCantidadEnPalabras(opts.minutosGanados);
    phrases.push(`Ganaste ${min} minutos para la cola.`);
  }

  return phrases.filter(Boolean);
}

/** Profundidad horaria de sesión desglosador. */
export function buildDesglosadorDepthPhrases(delta: number, hoursDone?: number): string[] {
  if (delta <= 0) return [];
  const psFrase = psGanadosFrase(delta);
  if (hoursDone && hoursDone > 0) {
    return [`Hora ${hoursDone} de sesión completada.`, psFrase].filter(Boolean);
  }
  return [`Profundidad de sesión.`, psFrase].filter(Boolean);
}
