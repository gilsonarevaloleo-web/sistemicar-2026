import type { ProyectoEtiqueta, RutaMentalId, RutasMentalesSet } from "@/lib/proyectos";
import { RutasMentalesGrafo } from "./RutasMentalesGrafo";

const RUTA_COLOR: Record<RutaMentalId, string> = {
  a: "#38BDF8",
  b: "#A855F7",
  c: "#f87171",
};

type Props = {
  rutas: RutasMentalesSet;
  onChange: (next: RutasMentalesSet) => void;
  etiqueta?: ProyectoEtiqueta;
  /** true = edición en Hub (fuente de verdad); false = ajuste solo del bloque de hoy */
  desdeProyecto?: boolean;
  /**
   * En Hub: el grafo de pasos ya se muestra en la vista de lectura.
   * Aquí solo quedan selector A/B/C + personalizar +1/+2.
   */
  ocultarGrafo?: boolean;
};

/** Editor compacto: claridad mental A/B/C (no pasos biológicos del desglosador). */
export function RutasMentalesEditor({
  rutas,
  onChange,
  etiqueta = "proyecto",
  desdeProyecto = false,
  ocultarGrafo = false,
}: Props) {
  const activa = rutas.rutas[rutas.rutaActiva];

  const setRutaActiva = (id: RutaMentalId) => {
    onChange({ ...rutas, rutaActiva: id });
  };

  const setPasoTitulo = (numero: 2 | 3, titulo: string) => {
    const r = rutas.rutas[rutas.rutaActiva];
    const pasos = r.pasos.map(p => (p.numero === numero ? { ...p, titulo } : p));
    onChange({
      ...rutas,
      rutas: { ...rutas.rutas, [rutas.rutaActiva]: { ...r, pasos } },
    });
  };

  return (
    <div
      className="p-3 rounded-xl border space-y-3"
      style={{ backgroundColor: "rgba(255,255,255,0.02)", borderColor: "rgba(56,189,248,0.2)" }}
    >
      {!ocultarGrafo && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
            {desdeProyecto ? "Dirección de claridad (Hub)" : "Claridad de este bloque (hoy)"}
          </p>
          <p className="text-[8px] text-slate-600 mt-0.5 leading-relaxed">
            {etiqueta === "centro"
              ? "Centro = deber por circunstancia. Paso 1 = este bloque; 2 y 3 = cierre y handoff."
              : "Proyecto = lo que eliges crecer. Paso 1 = este bloque; 2 y 3 = entrega y oleada."}
            {!desdeProyecto && " La rutina no guarda pasos: se leen del proyecto al cargar el día."}
          </p>
        </div>
      )}

      <div>
        <p className="text-[7px] text-slate-600 uppercase tracking-wider mb-1.5">Ruta activa</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(["a", "b", "c"] as const).map(id => {
            const meta = rutas.rutas[id];
            const active = rutas.rutaActiva === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setRutaActiva(id)}
                className="py-2 px-1 rounded-lg text-left transition-all"
                style={{
                  backgroundColor: active ? `${RUTA_COLOR[id]}15` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? `${RUTA_COLOR[id]}45` : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <p className="text-[8px] font-black" style={{ color: active ? RUTA_COLOR[id] : "#64748b" }}>
                  {id.toUpperCase()}
                </p>
                <p className="text-[7px] text-slate-500 mt-0.5 leading-tight line-clamp-2">
                  {meta.label.split("·")[1]?.trim() ?? meta.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {!ocultarGrafo && <RutasMentalesGrafo rutas={rutas} compact />}

      <div className="space-y-1.5 pt-1 border-t border-white/5">
        <p className="text-[7px] text-slate-600 uppercase tracking-wider">Personalizar pasos +1 y +2</p>
        {[2, 3].map(n => {
          const paso = activa.pasos.find(p => p.numero === n);
          return (
            <input
              key={n}
              value={paso?.titulo ?? ""}
              onChange={e => setPasoTitulo(n as 2 | 3, e.target.value)}
              placeholder={`Paso ${n}`}
              className="w-full px-2 py-1.5 rounded-lg bg-black/30 border border-white/8 text-[9px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
            />
          );
        })}
      </div>
    </div>
  );
}
