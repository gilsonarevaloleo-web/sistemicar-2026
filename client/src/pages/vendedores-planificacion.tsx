import { useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Users,
  DollarSign,
  Download,
  MessageCircle,
  CheckCircle,
  Magnet,
  Layers,
  ChevronDown,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { SELLER_COMMISSION_RATE } from "@shared/sellerCommissions";
import { buildSellerPagosUrl } from "@/lib/sellerRef";
import { CategoriaSistemicarBanner } from "@/components/CategoriaSistemicarBanner";
import { SISTEMICAR_CATEGORY } from "@/lib/sistemicarCategory";
import {
  CATALOGO_PELDAO,
  ESCALERA_CAPAS,
  ESCALERA_INTEGRACION,
  EMBUDO_PREGUNTAS,
  GUION_VENTA,
  IMAN_FLUJO,
  IMAN_FRASES,
  IMAN_OBJECIONES,
  INVENTARIO_PRODUCTO,
  KIT_ELEVATOR_PITCH,
  KIT_MD_PATH,
  KIT_RESUMEN_30S,
  KIT_VERSION,
  LISTA_ROJA,
  MATRIZ_BENEFICIOS,
  OBJECIONES,
  PRODUCTOS,
  STACKS,
} from "@/content/kitVendedoresPlanificacion";

const GOLD = "#D4AF37";
const WHATSAPP = "51918260514";

function Section({
  id,
  title,
  subtitle,
  icon: Icon,
  color = GOLD,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon: ComponentType<{ size?: number; className?: string; style?: CSSProperties }>;
  color?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-white/10 bg-card/30 overflow-hidden mb-4" data-testid={id}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-white/[0.02]"
      >
        <div className="flex items-start gap-2 min-w-0">
          <Icon size={16} className="flex-shrink-0 mt-0.5" style={{ color }} />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">{title}</h2>
            {subtitle && <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function VendedoresPlanificacion() {
  const [, navigate] = useLocation();
  const [demoCode, setDemoCode] = useState("TU-CODIGO");

  const copyText = (text: string, label = "Copiado") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const copyLink = (code: string) => copyText(buildSellerPagosUrl(code), "Link copiado");

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 pb-24">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/documentos")}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm"
          data-testid="button-back-vendedores"
        >
          <ArrowLeft size={16} />
          Documentos
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-4">
            <Users size={12} />
            Kit vendedores · v{KIT_VERSION}
          </div>
          <h1
            className="text-2xl md:text-3xl font-black mb-2"
            style={{ fontFamily: "Playfair Display, serif", color: GOLD }}
          >
            {SISTEMICAR_CATEGORY.name}
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            {SISTEMICAR_CATEGORY.oneLiner} Embudo comercial por peldaños + Escalera (capas de desarrollo). Solo Planificación — Espejo es otro producto.
          </p>
        </div>

        <div className="mb-6">
          <CategoriaSistemicarBanner variant="compact" />
        </div>

        {/* Resumen 30s */}
        <section
          className="p-4 rounded-xl border mb-6"
          style={{ borderColor: `${GOLD}30`, backgroundColor: `${GOLD}06` }}
          data-testid="kit-resumen-30s"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} style={{ color: GOLD }} />
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">Resumen en 30 segundos</h2>
          </div>
          <ul className="space-y-2">
            {KIT_RESUMEN_30S.map(line => (
              <li key={line} className="text-[11px] text-slate-400 leading-relaxed flex gap-2">
                <span className="text-amber-500/60 flex-shrink-0">·</span>
                {line}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => copyText(KIT_ELEVATOR_PITCH, "Elevator pitch copiado")}
            className="mt-4 w-full py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:border-white/20"
            style={{ borderColor: `${GOLD}25` }}
          >
            Copiar elevator pitch
          </button>
        </section>

        {/* Escalera de Conciencia */}
        <section
          className="p-4 rounded-xl border mb-6"
          style={{ borderColor: "rgba(168,85,247,0.35)", backgroundColor: "rgba(168,85,247,0.06)" }}
          data-testid="kit-escalera-conciencia"
        >
          <div className="flex items-center gap-2 mb-2">
            <Layers size={16} style={{ color: "#A855F7" }} />
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
              Escalera de Conciencia
            </h2>
          </div>
          <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
            Tres capas de desarrollo (no jerarquía moral) — visible en Planificación ? Métricas. Vende la profundidad del método Base.
          </p>
          <div className="space-y-3">
            {ESCALERA_CAPAS.map(capa => (
              <div
                key={capa.id}
                className="p-3 rounded-lg border pl-4 relative overflow-hidden"
                style={{ borderColor: `${capa.color}30`, backgroundColor: "rgba(0,0,0,0.25)" }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: capa.color }}
                />
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: capa.color }}>
                  Capa {capa.capa} · {capa.titulo}
                </p>
                <p className="text-[11px] font-bold text-slate-200 mt-1">{capa.pregunta}</p>
                <p className="text-[10px] text-slate-500 mt-1">{capa.metrica}</p>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed italic">{capa.copyVenta}</p>
                <p className="text-[9px] text-slate-600 mt-2 font-mono">Demo: {capa.demo}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-4 leading-relaxed italic border-t border-white/5 pt-3">
            {ESCALERA_INTEGRACION}
          </p>
          <p className="text-[9px] text-purple-400/80 mt-2">
            Badge <strong>Puente</strong> en app = presencia alta pero pocas decisiones. Momento ideal para hablar del peldaño 2 Ritmo (segmentos + Situacional).
          </p>
        </section>

        {/* Embudo peldaños comercial */}
        <section className="p-4 rounded-xl border mb-6 border-white/10 bg-card/30" data-testid="kit-embudo">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            ¿En qué peldaño comercial está el cliente?
          </h2>
          <div className="space-y-3">
            {EMBUDO_PREGUNTAS.map(item => (
              <div key={item.peldao} className="flex gap-3">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ backgroundColor: `${GOLD}20`, color: GOLD }}
                >
                  {item.peldao}
                </span>
                <div>
                  <p className="text-[11px] font-bold text-slate-300">{item.pregunta}</p>
                  <p className="text-[10px] text-slate-500">{item.respuesta}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-slate-600 mt-3 italic">
            Ritmo (peldaño 2) antes que Norte (peldaño 3): primero medir unidades, después horizonte/proyectos.
          </p>
        </section>

        {/* Comisión */}
        <section
          className="p-4 rounded-xl border mb-6"
          style={{ borderColor: `${GOLD}30`, backgroundColor: `${GOLD}08` }}
          data-testid="kit-comision"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} style={{ color: GOLD }} />
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">Comisión 30%</h2>
          </div>
          <p className="text-sm text-white font-bold">
            {Math.round(SELLER_COMMISSION_RATE * 100)}% cada mes que el cliente pague
          </p>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Recurrente en suscripciones Base, Ritmo y Norte. Si cancela, deja de generarse comisión. Espejo ($17 único) ~$5.10 una vez — no recurrente.
          </p>
        </section>

        {/* Stacks */}
        <section className="mb-6" data-testid="kit-stacks">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Stacks por evolución</h2>
          <div className="grid gap-3">
            {STACKS.map(s => (
              <div key={s.title} className="p-4 rounded-xl border border-white/10 bg-card/40">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-white text-sm">{s.title}</h3>
                  <span className="text-[9px] text-slate-500 uppercase">{s.peldao}</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">{s.modules}</p>
                <p className="text-lg font-black" style={{ color: GOLD }}>
                  ~${s.total.toFixed(2)}
                  <span className="text-xs text-slate-500 font-normal">/mes</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{s.desc}</p>
                <p className="text-[9px] text-emerald-400/80 mt-2">
                  Comisión ~${s.comisionEjemplo.toFixed(2)}/mes mientras renueve
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Catálogo por peldaño */}
        <Section
          id="kit-catalogo"
          title="Catálogo por peldaño"
          subtitle="Qué incluye cada add-on · frases de venta"
          icon={CheckCircle}
          color="#38BDF8"
          defaultOpen
        >
          <div className="space-y-4 pt-3">
            {CATALOGO_PELDAO.map(cat => (
              <div key={cat.peldao} className="p-3 rounded-lg border border-white/10 bg-black/20">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Peldaño {cat.peldao}
                </p>
                <h3 className="text-sm font-bold text-white mt-1">{cat.titulo}</h3>
                <p className="text-[11px] italic text-amber-400/90 mt-2">"{cat.frase}"</p>
                <ul className="mt-3 space-y-1">
                  {cat.incluye.map(item => (
                    <li key={item} className="text-[10px] text-slate-400 flex gap-2">
                      <CheckCircle size={12} className="flex-shrink-0 text-emerald-500 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-[9px] text-slate-600 mt-2">{cat.noIncluye}</p>
                {"demo" in cat && cat.demo && (
                  <p className="text-[9px] text-cyan-500/70 mt-1 font-mono">Demo: {cat.demo}</p>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Imán */}
        <Section
          id="kit-iman"
          title="Imán de pensamientos"
          subtitle="Peldaño 3 · demo 2 min"
          icon={Magnet}
          color="#94a3b8"
        >
          <div className="pt-3">
            <p className="text-sm text-white font-semibold mb-4">
              El primer sistema que ordena pensamientos hacia proyectos, tiempo y pasos de fe.
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Flujo en demo</p>
            <ol className="space-y-1.5 mb-5">
              {IMAN_FLUJO.map((step, i) => (
                <li key={i} className="flex gap-2 text-[11px] text-slate-400">
                  <span className="font-mono text-slate-600 flex-shrink-0">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Objeciones</p>
            <div className="space-y-2 mb-5">
              {IMAN_OBJECIONES.map(o => (
                <div key={o.q} className="p-3 rounded-lg border border-white/5 bg-black/30">
                  <p className="text-[11px] font-bold text-slate-300 mb-1">{o.q}</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{o.a}</p>
                </div>
              ))}
            </div>
            <ul className="space-y-1.5 mb-4">
              {IMAN_FRASES.map(f => (
                <li key={f} className="text-[10px] text-slate-400 italic leading-relaxed pl-3 border-l-2 border-slate-600">
                  "{f}"
                </li>
              ))}
            </ul>
            <p className="text-[9px] text-amber-500/80">
              No digas que el Imán reemplaza al desglosador. El usuario cierra bloques y cumple subs.
            </p>
          </div>
        </Section>

        {/* Matriz beneficios */}
        <Section id="kit-matriz" title="Matriz persona ? peldaño" icon={Users} color={GOLD}>
          <div className="pt-3 overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-slate-500 text-left border-b border-white/10">
                  <th className="pb-2 pr-2">Persona</th>
                  <th className="pb-2 pr-2">Dolor</th>
                  <th className="pb-2 pr-2">Peldaño</th>
                  <th className="pb-2">Demo</th>
                </tr>
              </thead>
              <tbody>
                {MATRIZ_BENEFICIOS.map(row => (
                  <tr key={row.persona} className="border-b border-white/5 text-slate-400">
                    <td className="py-2 pr-2 text-slate-300">{row.persona}</td>
                    <td className="py-2 pr-2">{row.dolor}</td>
                    <td className="py-2 pr-2 font-bold" style={{ color: GOLD }}>
                      {row.peldao}
                    </td>
                    <td className="py-2">{row.demo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Productos precio */}
        <section className="mb-6" data-testid="kit-productos">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Precios · comisión 30%</h2>
          <div className="space-y-2">
            {PRODUCTOS.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10">
                <div>
                  <p className="text-sm font-bold text-white">{p.name}</p>
                  <p className="text-[10px] text-slate-500">{p.stack}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black" style={{ color: p.color }}>
                    ${p.price}
                    <span className="text-[10px] text-slate-500">/mes</span>
                  </p>
                  <p className="text-[9px] text-emerald-400">Comisión ${p.comision.toFixed(2)}/mes</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Objeciones */}
        <Section id="kit-objeciones" title="Objeciones frecuentes" icon={MessageCircle}>
          <div className="space-y-2 pt-3">
            {OBJECIONES.map(o => (
              <div key={o.q} className="p-3 rounded-lg border border-white/5">
                <p className="text-[11px] font-bold text-slate-300">{o.q}</p>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{o.a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Lista roja */}
        <Section id="kit-lista-roja" title="Qué NO prometer" icon={AlertTriangle} color="#991b1b">
          <ul className="space-y-2 pt-3">
            {LISTA_ROJA.map(item => (
              <li key={item} className="flex gap-2 text-[11px] text-red-300/80">
                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        {/* Guion */}
        <section className="mb-6" data-testid="kit-guion">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Guion de venta</h2>
          <ul className="space-y-2">
            {GUION_VENTA.map((q, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-slate-400 leading-relaxed">
                <CheckCircle size={14} className="flex-shrink-0 text-emerald-500 mt-0.5" />
                {q}
              </li>
            ))}
          </ul>
        </section>

        {/* Inventario */}
        <Section id="kit-inventario" title="Inventario producto (jun 2026)" icon={Sparkles} color="#64748b">
          <div className="pt-3 space-y-2">
            {INVENTARIO_PRODUCTO.map(row => (
              <div key={row.area} className="flex items-start justify-between gap-2 text-[10px]">
                <span className="text-slate-400">{row.area}</span>
                <span className="text-emerald-500/80 shrink-0">{row.estado}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Link vendedor */}
        <section className="p-5 rounded-xl border mb-6" style={{ borderColor: `${GOLD}40` }} data-testid="kit-link">
          <h2 className="text-sm font-bold text-white mb-2">Tu link de venta</h2>
          <p className="text-[11px] text-slate-500 mb-3">
            Gilson te asigna un código. El cliente debe pagar desde este link (`ref=TU-CODIGO`):
          </p>
          <div className="flex gap-2 mb-3">
            <input
              value={demoCode}
              onChange={e => setDemoCode(e.target.value.toUpperCase())}
              placeholder="TU-CODIGO"
              className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-sm font-mono"
              data-testid="input-seller-code-demo"
            />
            <button
              type="button"
              onClick={() => copyLink(demoCode)}
              className="px-3 py-2 rounded-lg font-bold text-black text-xs flex items-center gap-1"
              style={{ background: GOLD }}
            >
              <Copy size={14} />
              Copiar
            </button>
          </div>
          <p className="text-[10px] font-mono text-slate-600 break-all">
            {buildSellerPagosUrl(demoCode || "TU-CODIGO")}
          </p>
        </section>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/docs/EMBUDO_PLANIFICACION.md"
            download
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/5"
          >
            <Download size={16} />
            Embudo (MD)
          </a>
          <a
            href={KIT_MD_PATH}
            download
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/5"
          >
            <Download size={16} />
            Kit vendedores (MD)
          </a>
          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola Gilson, quiero ser vendedor de Planificación SISTEMICAR.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: "#25D366" }}
          >
            <MessageCircle size={16} />
            Solicitar código
          </a>
        </div>

        <p className="text-[9px] text-slate-600 text-center mt-8 italic">
          Gilson · WhatsApp +51 918 260 514 · Panel admin /admin-gilson ? Vendedores
        </p>
      </motion.div>
    </div>
  );
}
