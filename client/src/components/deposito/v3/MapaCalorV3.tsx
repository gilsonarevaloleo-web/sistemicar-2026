import React from "react";
import {
  CANON_TEN_EYES,
  EYE_CODES,
  characterMapDe,
  isEyeLocked,
  syntacticVaciosDe,
  type DepotAnalysisResult,
  type UserTier,
} from "@shared/deposito/v3";

const GOLD = "#D4AF37";

export interface MapaCalorV3Props {
  result: DepotAnalysisResult;
  userTier: UserTier;
}

export function MapaCalorV3({ result, userTier }: MapaCalorV3Props) {
  const mapa = characterMapDe(result);
  const vacios = syntacticVaciosDe(result);

  return (
    <div
      className="border px-5 py-5"
      style={{ borderColor: `${GOLD}44`, backgroundColor: "rgba(0,0,0,0.45)" }}
      data-testid="deposito-v3-mapa"
    >
      <div className="mb-4 flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: `${GOLD}22` }}>
        <h3
          className="text-[10px] font-bold uppercase tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          Mapa de calor · 10 códigos de carácter
        </h3>
        <span className="text-[10px] font-mono text-white/45" data-testid="deposito-v3-mapa-ejes">
          FIRMA C{result.characterSignedCode} · {vacios.length} VACÍOS
        </span>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {EYE_CODES.map((eyeId) => {
          const eye = CANON_TEN_EYES[eyeId];
          const locked = isEyeLocked(eyeId, userTier);
          const isCharacter = result.characterSignedCode === eyeId;
          const isVacio = vacios.includes(eyeId);
          const activo = Boolean(mapa[eyeId]);

          let border = "rgba(255,255,255,0.08)";
          let bg = "transparent";
          let fg = "rgba(255,255,255,0.35)";
          if (locked && !isCharacter) {
            border = "rgba(255,255,255,0.05)";
            fg = "rgba(255,255,255,0.22)";
          } else if (activo) {
            border = `${GOLD}80`;
            bg = `${GOLD}14`;
            fg = GOLD;
          } else if (isVacio) {
            border = "rgba(255,255,255,0.06)";
            fg = "rgba(255,255,255,0.28)";
          }

          return (
            <li
              key={eyeId}
              className="relative flex h-24 flex-col justify-between p-3"
              style={{ border: `1px solid ${border}`, backgroundColor: bg, color: fg }}
              data-testid={`deposito-v3-eye-${eyeId}`}
              data-locked={locked ? "1" : "0"}
              data-caracter={isCharacter ? "1" : "0"}
              data-vacio={isVacio ? "1" : "0"}
              data-activo={activo ? "1" : "0"}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[10px] font-bold">C{eyeId}</span>
                <div className="flex items-center gap-1">
                  {locked && (
                    <span className="text-[8px] tracking-widest text-white/30">BLOQ</span>
                  )}
                  {isCharacter && (
                    <span
                      className="px-1 text-[8px] font-mono"
                      style={{ color: GOLD, border: `1px solid ${GOLD}55` }}
                    >
                      FIRMA
                    </span>
                  )}
                  {isVacio && !isCharacter && (
                    <span className="text-[8px] tracking-widest text-white/25">VACÍO</span>
                  )}
                </div>
              </div>
              <div>
                <p className="truncate text-xs font-bold text-white/80">{eye.name}</p>
                <p className="truncate text-[10px] font-mono text-white/35">
                  {eye.syntaxLabel} · {eye.concept}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default MapaCalorV3;
