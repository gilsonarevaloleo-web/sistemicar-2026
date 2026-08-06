import { motion } from "framer-motion";
import { ArrowLeft, Map, Shield, Brain, Zap, Heart, BookOpen, BarChart3, Settings, Users, FileText, Eye, Compass, Clock, Star, Target, Radio, Scroll, Lock, HelpCircle, Home, Sparkles, ShoppingCart, ExternalLink, Flame, Layers } from "lucide-react";
import { useLocation } from "wouter";
import { BADGE_EN_CAMINO } from "@shared/moduleCatalog";
import { JORNADA_MODULE } from "@/lib/jornadaBrand";

const GOLD = "#D4AF37";
const EMERALD = "#10B981";
const VIOLET = "#7C3AED";
const BLUE = "#3b82f6";
const BLOOD = "#8B0000";
const ORANGE = "#f97316";

interface Ruta {
  path: string;
  nombre: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
  color: string;
  acceso: "libre" | "usuario" | "planificacion_base" | "soberania_dia" | "operativo" | "en_camino";
}

const CATEGORIAS: { titulo: string; color: string; rutas: Ruta[] }[] = [
  {
    titulo: "Módulos Principales",
    color: GOLD,
    rutas: [
      { path: "/menu", nombre: "Menú Principal", desc: "Panel central de navegación", icon: Home, color: GOLD, acceso: "usuario" },
      { path: "/jornada-v4", nombre: JORNADA_MODULE.title, desc: `${JORNADA_MODULE.tagline} — Jornada Base (Conquista + PS)`, icon: Zap, color: ORANGE, acceso: "planificacion_base" },
      { path: "/proyectos", nombre: "Proyectos y Peldaños", desc: "Hub — requiere Norte (peldaño alto valor)", icon: Layers, color: "#38BDF8", acceso: "soberania_dia" },
      { path: "/espejo", nombre: "Espejo Soberano", desc: "Vaciado mental · Doctor IA", icon: Heart, color: "#ef4444", acceso: "libre" },
      { path: "/proyector", nombre: "Proyector", desc: "Arquitectura de realidad futura — 4 ejes × 5 niveles", icon: Target, color: VIOLET, acceso: "en_camino" },
      { path: "/alquimia", nombre: "Alquimia", desc: "Transformación de estados internos", icon: Sparkles, color: VIOLET, acceso: "en_camino" },
      { path: "/esperanza", nombre: "Depósito (Esperanza)", desc: "Registro de esperanzas y deseos futuros", icon: Star, color: EMERALD, acceso: "en_camino" },
    ]
  },
  {
    titulo: "Inteligencia y Análisis",
    color: BLUE,
    rutas: [
      { path: "/radar", nombre: "Radar IA", desc: "Detección de tensiones y sugerencias de misión con Gemini", icon: Radio, color: BLUE, acceso: "en_camino" },
      { path: "/analytics", nombre: "Analytics", desc: "Estadísticas y gráficos de rendimiento", icon: BarChart3, color: BLUE, acceso: "usuario" },
      { path: "/codice", nombre: "Códice", desc: "ADN Soberano — leyes conductuales del usuario", icon: Scroll, color: GOLD, acceso: "usuario" },
      { path: "/escaner", nombre: "Escáner", desc: "Análisis profundo de patrones cognitivos", icon: Eye, color: EMERALD, acceso: "usuario" },
      { path: "/metricas", nombre: "Métricas Cognitivas", desc: "Documento de mediciones y significado psicológico", icon: Brain, color: VIOLET, acceso: "usuario" },
    ]
  },
  {
    titulo: "Historial y Progreso",
    color: EMERALD,
    rutas: [
      { path: "/historial", nombre: "Historial Unificado", desc: "5 tabs: Espejo, Planificación, Alquimia, Depósito, Sabiduría", icon: Clock, color: EMERALD, acceso: "libre" },
      { path: "/historia", nombre: "Historia", desc: "Línea temporal de actividades y logros", icon: BookOpen, color: EMERALD, acceso: "usuario" },
      { path: "/rewards", nombre: "Rewards", desc: "Sistema de recompensas y puntos acumulados", icon: Star, color: GOLD, acceso: "usuario" },
      { path: "/inmunidad", nombre: "Cámara de Inmunidad", desc: "Protección y refugio emocional", icon: Shield, color: BLUE, acceso: "usuario" },
    ]
  },
  {
    titulo: "Formación y Guías",
    color: VIOLET,
    rutas: [
      { path: "/tutorial", nombre: "Tutorial", desc: "Guía paso a paso para nuevos usuarios", icon: HelpCircle, color: VIOLET, acceso: "usuario" },
      { path: "/como-funciona", nombre: "Cómo Funciona", desc: "Explicación del sistema y sus módulos", icon: Compass, color: BLUE, acceso: "usuario" },
      { path: "/documentos", nombre: "Documentos", desc: "Especificaciones técnicas descargables", icon: FileText, color: GOLD, acceso: "libre" },
      { path: "/acerca", nombre: "Acerca / Manifiesto", desc: "Filosofía y visión de SISTEMICAR", icon: Flame, color: ORANGE, acceso: "usuario" },
      { path: "/manuales", nombre: "Manuales", desc: "Biblioteca de guías", icon: BookOpen, color: GOLD, acceso: "en_camino" },
    ]
  },
  {
    titulo: "Comercio y Acceso",
    color: ORANGE,
    rutas: [
      { path: "/embudo", nombre: "Embudo SISTEMICAR", desc: "Funnel de ventas principal", icon: ExternalLink, color: ORANGE, acceso: "libre" },
      { path: "/umbral", nombre: "Umbral", desc: "Página de entrada y conversión", icon: Lock, color: GOLD, acceso: "en_camino" },
      { path: "/umbral-leads", nombre: "Umbral Leads", desc: "Captura de prospectos interesados", icon: Users, color: BLUE, acceso: "libre" },
      { path: "/pagos", nombre: "Pagos", desc: "Jornada V4 — Base, Ritmo del día, Norte", icon: ShoppingCart, color: EMERALD, acceso: "libre" },
      { path: "/gracias-compra", nombre: "Gracias por tu Compra", desc: "Página post-compra con siguiente paso", icon: Star, color: GOLD, acceso: "libre" },
    ]
  },
  {
    titulo: "Administración",
    color: "#6b7280",
    rutas: [
      { path: "/socios", nombre: "Alianza (Socios)", desc: "Panel de socios y colaboradores", icon: Users, color: "#6b7280", acceso: "en_camino" },
      { path: "/admin-gilson", nombre: "Admin Gilson", desc: "Panel de administración exclusivo", icon: Settings, color: "#6b7280", acceso: "usuario" },
      { path: "/acceso", nombre: "Acceso / Login", desc: "Inicio de sesión con Google", icon: Lock, color: "#6b7280", acceso: "libre" },
      { path: "/bienvenida", nombre: "Bienvenida", desc: "Pantalla de bienvenida inicial", icon: Home, color: "#6b7280", acceso: "libre" },
      { path: "/terminos-condiciones", nombre: "Términos y Condiciones", desc: "Marco legal del servicio", icon: FileText, color: "#6b7280", acceso: "libre" },
      { path: "/libro-reclamaciones", nombre: "Libro de Reclamaciones", desc: "Canal de quejas oficial", icon: FileText, color: "#6b7280", acceso: "libre" },
      { path: "/mapa", nombre: "Mapa de SISTEMICAR", desc: "Esta página — todas las rutas del sistema", icon: Map, color: GOLD, acceso: "usuario" },
    ]
  }
];

const ACCESO_LABELS: Record<string, { label: string; color: string }> = {
  libre: { label: "LIBRE", color: EMERALD },
  usuario: { label: "USUARIO", color: BLUE },
  planificacion_base: { label: "JORNADA BASE", color: GOLD },
  soberania_dia: { label: "NORTE", color: "#38BDF8" },
  operativo: { label: "RITMO", color: "#00C851" },
  en_camino: { label: "EN CAMINO", color: "#64748b" },
};

export default function MapaSistemicar() {
  const [, navigate] = useLocation();
  const totalRutas = CATEGORIAS.reduce((sum, c) => sum + c.rutas.length, 0);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 pb-24">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/menu")} className="p-2 rounded-lg border border-white/10" data-testid="button-back-mapa">
            <ArrowLeft size={16} className="text-slate-400" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-wider" style={{ color: GOLD, fontFamily: "Playfair Display, serif" }}>MAPA DE SISTEMICAR</h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">{totalRutas} rutas · {CATEGORIAS.length} categorías</p>
          </div>
        </div>

        <div className="p-3 rounded-xl border mb-4 flex items-center gap-3" style={{ backgroundColor: `${GOLD}05`, borderColor: `${GOLD}15` }}>
          <Map size={16} style={{ color: GOLD }} />
          <p className="text-[10px] text-slate-400">Precios hoy: Jornada Base $24.99/mes · Ritmo del día $29.99/mes · Norte $34.99/mes</p>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.entries(ACCESO_LABELS).map(([key, val]) => (
            <span key={key} className="text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ backgroundColor: `${val.color}15`, color: val.color, border: `1px solid ${val.color}30` }}>
              {val.label}
            </span>
          ))}
        </div>

        <div className="space-y-5">
          {CATEGORIAS.map((cat, ci) => (
            <motion.div key={ci} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.05 }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <h2 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cat.color }}>{cat.titulo}</h2>
                <span className="text-[8px] text-slate-600">({cat.rutas.length})</span>
              </div>
              <div className="space-y-1.5">
                {cat.rutas.map((ruta, ri) => {
                  const Icon = ruta.icon;
                  const accLabel = ACCESO_LABELS[ruta.acceso];
                  return (
                    <motion.button
                      key={ri}
                      onClick={() => navigate(ruta.path)}
                      whileTap={{ scale: 0.98 }}
                      className="w-full text-left p-3 rounded-xl border transition-all"
                      style={{ backgroundColor: "#0a0a0a", borderColor: "rgba(255,255,255,0.06)" }}
                      data-testid={`button-ruta-${ruta.path.slice(1)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: `${ruta.color}15` }}>
                          <Icon size={14} style={{ color: ruta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="text-[11px] font-bold text-white truncate">{ruta.nombre}</p>
                            <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${accLabel.color}10`, color: accLabel.color }}>
                              {accLabel.label}
                            </span>
                            {ruta.acceso === "en_camino" && (
                              <span className="text-[7px] text-slate-500 italic">{BADGE_EN_CAMINO}</span>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-500 leading-relaxed">{ruta.desc}</p>
                          <p className="text-[8px] text-slate-600 mt-0.5 font-mono">{ruta.path}</p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 p-3 rounded-xl border text-center" style={{ backgroundColor: `${GOLD}05`, borderColor: `${GOLD}15` }}>
          <p className="text-[9px] text-slate-500 italic">Slot reservado para próximo módulo — venta independiente cuando esté listo.</p>
        </div>
      </motion.div>
    </div>
  );
}
