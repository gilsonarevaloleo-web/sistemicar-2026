/**
 * Identidad visual de un proyecto.
 * El color vive en el Hub; operaciones de vehículo solo lo leen.
 */
export const PROYECTO_PALETTE = [
  "#38BDF8",
  "#A855F7",
  "#F97316",
  "#10b981",
  "#D4AF37",
  "#f87171",
  "#22d3ee",
  "#e879f9",
] as const;

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeProyectoHex(color?: string | null): string | null {
  const raw = color?.trim();
  if (!raw || !HEX_RE.test(raw)) return null;
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
  }
  return raw.toLowerCase();
}

export function hashProyectoId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Color guardado, o paleta estable por id si el proyecto aún no tiene tint. */
export function resolveProyectoColor(id: string, color?: string | null): string {
  const hex = normalizeProyectoHex(color);
  if (hex) return hex;
  if (!id) return PROYECTO_PALETTE[0];
  return PROYECTO_PALETTE[hashProyectoId(id) % PROYECTO_PALETTE.length];
}

export function proyectoColorAlpha(color: string, alpha: string): string {
  const hex = (normalizeProyectoHex(color) ?? PROYECTO_PALETTE[0]).slice(1);
  return `#${hex}${alpha}`;
}

/** Con 1 rumbo no hace falta lista. Con varios, el resumen cubre el envío. */
export function rumboPickerListVisible(
  abiertasCount: number,
  expanded: boolean
): boolean {
  return abiertasCount > 1 && expanded;
}

export function rumboPickerToggleEnabled(abiertasCount: number): boolean {
  return abiertasCount > 1;
}
