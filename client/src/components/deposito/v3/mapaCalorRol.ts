/**
 * Presencia y FOCO no se pintan igual.
 * C10 FOCO vacío (escalón pendiente) no puede lucir como celda activa.
 */
export type RolCeldaMapa =
  | "foco-activo"
  | "foco-vacio"
  | "bloqueado"
  | "activo"
  | "vacio";

export function rolCeldaMapaCalor(input: {
  isFoco: boolean;
  activo: boolean;
  isVacio: boolean;
  isCharacter: boolean;
  locked: boolean;
}): RolCeldaMapa {
  if (input.isFoco && input.activo) return "foco-activo";
  if (input.isFoco) return "foco-vacio";
  if (input.locked && !input.isCharacter) return "bloqueado";
  if (input.activo) return "activo";
  return "vacio";
}

export function celdaMuestraVacio(input: {
  isVacio: boolean;
  isCharacter: boolean;
}): boolean {
  return input.isVacio && !input.isCharacter;
}
