/**
 * Orden, número y copia de volcados de la puerta ¿Cuál es tu límite?
 * El orden es el de sellado (createdAt). Pagar el mapa no lo mueve.
 */

import { CASA_UMBRAL5_RITUAL } from "./prompt.ts";
import type { SesionUmbral5 } from "./sesion.ts";

export function formatearFechaVolcado(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function claveCreacion(iso: string, id: string): string {
  return `${iso}\0${id}`;
}

export function compararCreacionDesc(
  a: { createdAt: string; id: string },
  b: { createdAt: string; id: string },
): number {
  return claveCreacion(b.createdAt, b.id).localeCompare(
    claveCreacion(a.createdAt, a.id),
  );
}

export function ordenarVolcadosPorCreacion(
  sesiones: readonly SesionUmbral5[],
): SesionUmbral5[] {
  return [...sesiones].sort(compararCreacionDesc);
}

export function numerosVolcado(
  sesiones: readonly SesionUmbral5[],
): Map<string, number> {
  const ascendentes = [...sesiones].sort((a, b) =>
    claveCreacion(a.createdAt, a.id).localeCompare(
      claveCreacion(b.createdAt, b.id),
    ),
  );
  const map = new Map<string, number>();
  ascendentes.forEach((s, i) => map.set(s.id, i + 1));
  return map;
}

export function numeroVolcado(
  sesiones: readonly SesionUmbral5[],
  id: string,
): number {
  return numerosVolcado(sesiones).get(id) ?? 0;
}

export function etiquetaCanalVolcado(sesion: SesionUmbral5): string {
  if (sesion.lectura) {
    const canal = `C${sesion.lectura.codigoLimite ?? sesion.lectura.codigoUsuario}`;
    return sesion.estado === "MAPA_PAGO" ? `Mapa ${canal}` : canal;
  }
  return "Volcado";
}

export function recortarVolcado(texto: string, max = 160): string {
  const t = texto.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export function cabeceraVolcado(
  sesion: SesionUmbral5,
  numero: number,
): string {
  const canal = etiquetaCanalVolcado(sesion);
  const fecha = formatearFechaVolcado(sesion.createdAt);
  const canalParte = canal === "Volcado" ? "" : ` · ${canal}`;
  return `Volcado ${numero} · ${fecha}${canalParte}`;
}

export function formatearCopiaVolcado(
  sesion: SesionUmbral5,
  numero: number,
): string {
  const lineas = [
    `UMBRAL — ${cabeceraVolcado(sesion, numero)}`,
    `Fecha y hora: ${formatearFechaVolcado(sesion.createdAt)}`,
    "",
    CASA_UMBRAL5_RITUAL,
    sesion.textoVolcado.trim(),
  ];
  if (sesion.lectura) {
    lineas.push(
      "",
      `Canal: ${etiquetaCanalVolcado(sesion)}`,
      `Lectura fría: ${sesion.lectura.lecturaFria}`,
      `Por qué no ejecuta: ${sesion.lectura.porQueNoEjecuta}`,
    );
  }
  return lineas.join("\n");
}
