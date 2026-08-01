import { useState, useEffect, useRef, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, ArrowLeft, Shield, Check, Sparkles, Smartphone, ExternalLink, MessageCircle, Heart, Eye, Brain, Compass, Map, Layers, Clock, Zap, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PLANIFICACION_CHECKOUT_PLANS } from "@shared/mercadopagoPlans";
import { MODULOS_EN_CAMINO, BADGE_EN_CAMINO } from "@shared/moduleCatalog";
import { modulesGrantedByPlan } from "@shared/moduleAccess";
import {
  EMBUDO_PREGUNTAS_V2,
  PLANIFICACION_FULL_MONTHLY_USD,
  PLANIFICACION_STACKS,
  SKU_BASE,
  SKU_NORTE,
  SKU_RITMO,
} from "@shared/planificacionPricing";
import { captureSellerRefFromUrl, getSellerRef } from "@/lib/sellerRef";
import { CategoriaSistemicarBanner } from "@/components/CategoriaSistemicarBanner";
import { SISTEMICAR_CATEGORY } from "@/lib/sistemicarCategory";
import yapeQrImage from "@assets/yape_qr_2026-02-17T22-11-48_1771384383841.png";

const GOLD = "#D4AF37";
const PURPLE = "#9333ea";
const BLUE = "#3b82f6";

const PAYPAL_LINK = "https://paypal.me/ElimanAte";
const WHATSAPP_NUMBER = "51918260514";

interface PlanFeature {
  name: string;
  locked: boolean;
  highlight?: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  pricePEN: number;
  isOneTime?: boolean;
  features: PlanFeature[];
  icon: React.ElementType;
  color: string;
  popular?: boolean;
  badge?: string;
  forWho?: string;
  anchorCopy?: string;
  roiCopy?: string;
  peldaño?: string;
  funnelHint?: string;
}

const EMBUDO_PREGUNTAS = EMBUDO_PREGUNTAS_V2.map((q) => ({
  id: q.id,
  pregunta: q.pregunta,
  si: q.si,
  peldaño: q.peldaño,
}));

const espejoPlan: Plan = {
  id: "corazon-sabio",
  name: "El Corazón Sabio™",
  price: 17,
  pricePEN: 58.08,
  isOneTime: true,
  forWho: "Entrada al sistema",
  roiCopy: "Diagnóstico antes de invertir en módulos mensuales.",
  features: [
    { name: "Doctor IA que lee tu historial de conducta", locked: false },
    { name: "Detección de tu Interfaz de Dolor activa (M01–M10)", locked: false },
    { name: "Patrón de boicot identificado con datos reales", locked: false },
    { name: "Radiografía de tu brecha percepción/realidad", locked: false },
    { name: "10 créditos · ~2 diagnósticos completos", locked: false },
    { name: "7 días gratis — sin tarjeta", locked: false },
  ],
  icon: Heart,
  color: "#E8567F",
};

const planificacionPlans: Plan[] = [
  {
    id: SKU_BASE.id,
    name: SKU_BASE.name,
    price: SKU_BASE.priceUsd,
    pricePEN: SKU_BASE.pricePen,
    peldaño: "Peldaño 1 · Entrada urgente",
    forWho: SKU_BASE.forWho,
    anchorCopy: SKU_BASE.identity + " — vehículos Conquista + PS.",
    roiCopy: "Si no mides unidades, el día se va sin veredicto. Empieza aquí.",
    features: SKU_BASE.unlocks.map((name, i) => ({
      name,
      locked: false,
      highlight: i < 2,
    })),
    icon: Compass,
    color: GOLD,
    popular: true,
    funnelHint: SKU_BASE.funnelHint,
  },
  {
    id: SKU_RITMO.id,
    name: SKU_RITMO.name,
    price: SKU_RITMO.priceUsd,
    pricePEN: SKU_RITMO.pricePen,
    peldaño: "Peldaño 2 · Compromiso del día",
    funnelHint: SKU_RITMO.funnelHint,
    forWho: SKU_RITMO.forWho,
    anchorCopy: SKU_RITMO.identity,
    roiCopy: "Segmentos + Situacional: estructura e imprevistos sin perder el hilo.",
    features: SKU_RITMO.unlocks.map((name, i) => ({
      name,
      locked: false,
      highlight: i < 2,
    })),
    icon: Clock,
    color: "#00C851",
    badge: "RITMO",
  },
  {
    id: SKU_NORTE.id,
    name: SKU_NORTE.name,
    price: SKU_NORTE.priceUsd,
    pricePEN: SKU_NORTE.pricePen,
    peldaño: "Peldaño 3 · Alto valor",
    funnelHint: SKU_NORTE.funnelHint,
    forWho: SKU_NORTE.forWho,
    anchorCopy: SKU_NORTE.identity,
    roiCopy: "Crisol + Hub: solo cuando ya cierras unidades y quieres horizonte.",
    features: SKU_NORTE.unlocks.map((name, i) => ({
      name,
      locked: false,
      highlight: i < 2,
    })),
    icon: Layers,
    color: "#38BDF8",
    badge: "NORTE",
  },
];

const STACK_COLORS: Record<string, string> = {
  ritmo: "#00C851",
  norte: GOLD,
};

const STACKS = PLANIFICACION_STACKS.map((stack) => ({
  id: stack.id,
  title: stack.title,
  subtitle: stack.subtitle,
  modules: stack.modulesLabel,
  totalUsd: stack.totalUsd,
  addOnId: stack.highlightAddOnId,
  color: STACK_COLORS[stack.id] ?? GOLD,
  desc: stack.desc,
}));

type PaymentMethod = "mercadopago" | "paypal" | "yape" | null;

const WARM_ROSE = "#E8567F";

const ESPEJO_BENEFITS = [
  { icon: Brain, text: "Doctor IA que lee tu historial de conducta", color: "#00FFC3" },
  { icon: Eye, text: "Detección de tu Interfaz de Dolor activa (M01–M10)", color: "#FF3131" },
  { icon: Heart, text: "Patrón de boicot identificado con datos reales", color: WARM_ROSE },
  { icon: Zap, text: "Radiografía de tu brecha percepción/realidad", color: GOLD },
  { icon: Shield, text: "10 créditos · ~2 diagnósticos completos", color: "#3b82f6" },
  { icon: Sparkles, text: "7 días gratis — sin tarjeta", color: "#F97316" },
];

export default function Pagos() {
  const [location, navigate] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<Plan>(planificacionPlans[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isEspejoProduct, setIsEspejoProduct] = useState(false);
  const [activeSellerRef, setActiveSellerRef] = useState<string | null>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  const selectStack = (addOnId: "soberania_dia" | "operativo") => {
    const plan = planificacionPlans.find((p) => p.id === addOnId);
    if (plan) {
      setSelectedPlan(plan);
      setTimeout(() => {
        paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  };
  
  const claimModule = useCallback(async (planId: string) => {
    const user = auth?.currentUser;
    if (!user || !modulesGrantedByPlan(planId).length) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/planificacion/claim-module", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.activated) {
        toast.success(data.message || "Módulo activado.");
        window.dispatchEvent(new CustomEvent("progression-updated"));
      }
    } catch {
      // webhook puede haber activado ya
    }
  }, []);

  const claimEspejoCredits = useCallback(async () => {
    const user = auth?.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/espejo/claim-purchase-credits", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.grantedCredits > 0) {
        toast.success(data.message || `Se activaron ${data.grantedCredits} créditos en Espejo.`);
        window.dispatchEvent(new CustomEvent("espejo-credits-updated"));
      }
    } catch {
      // Webhook puede haber acreditado ya; claim es respaldo silencioso
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const captured = captureSellerRefFromUrl(window.location.search);
    setActiveSellerRef(captured ?? getSellerRef());
    const producto = params.get("producto");
    if (producto === "espejo") {
      setIsEspejoProduct(true);
    }

    const status = params.get("status");
    const planParam = params.get("plan");

    if (planParam === "corazon-sabio") {
      setSelectedPlan(espejoPlan);
      setTimeout(() => {
        paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } else if (planParam && PLANIFICACION_CHECKOUT_PLANS.includes(planParam as typeof PLANIFICACION_CHECKOUT_PLANS[number])) {
      const p = planificacionPlans.find(x => x.id === planParam);
      if (p) {
        setSelectedPlan(p);
        setTimeout(() => {
          paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      }
    }

    if (status === "success") {
      if (planParam === "corazon-sabio") {
        toast.success("¡Pago confirmado! Activando tus 10 créditos de Espejo…");
        void claimEspejoCredits();
        if (!auth?.currentUser) {
          toast.info("Inicia sesión con el mismo correo del pago para ver tus créditos en /espejo.");
        }
      } else if (planParam && modulesGrantedByPlan(planParam).length > 0) {
        toast.success("¡Pago confirmado! Activando tu módulo…");
        void claimModule(planParam);
        if (!auth?.currentUser) {
          toast.info("Inicia sesión con el mismo correo del pago para acceder al módulo.");
        }
      } else {
        toast.success(`¡Pago exitoso! Plan ${planParam || ""}`);
      }
    } else if (status === "failure") {
      toast.error("El pago no se pudo completar. Intenta de nuevo.");
    } else if (status === "pending") {
      toast.info("Tu pago está pendiente de confirmación.");
    }
  }, [location, claimEspejoCredits, claimModule]);

  const handleMercadoPago = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          email: userEmail || localStorage.getItem("userEmail") || undefined,
          userName: localStorage.getItem("userName") || undefined,
          sellerRef: getSellerRef() || undefined,
        })
      });

      const data = await response.json();
      
      if (data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        throw new Error(data.error || "Error creando preferencia de pago");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar el pago. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const openPayPal = () => {
    window.open(`${PAYPAL_LINK}/${selectedPlan.price}USD`, "_blank");
  };

  const openWhatsApp = () => {
    if (!userEmail.trim()) {
      toast.error("Por favor ingresa tu correo electrónico");
      return;
    }
    const method = paymentMethod === "paypal" ? "PayPal" : "Yape";
    const amount = paymentMethod === "paypal" ? `$${selectedPlan.price} USD` : `S/ ${selectedPlan.pricePEN.toFixed(2)}`;
    const message = encodeURIComponent(
      `Hola Gilson, acabo de pagar mi suscripción a SISTEMICAR.\n\n` +
      `📧 Mi correo es: ${userEmail}\n` +
      `📦 Plan: ${selectedPlan.name}\n` +
      `💰 Monto: ${amount}\n` +
      `💳 Método: ${method}` +
      (getSellerRef() ? `\n🏷️ Ref vendedor: ${getSellerRef()}` : "")
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen p-4 md:p-10 max-w-4xl mx-auto pb-32"
      >
        <Link href="/menu" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm">
          <ArrowLeft size={16} />
          Volver al menú
        </Link>

        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-4">
            <Shield size={12} />
            Pago Seguro
          </div>
          {isEspejoProduct ? (
            <>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-2">
                EL CORAZÓN <span style={{ color: WARM_ROSE }}>SABIO™</span>
              </h1>
              <p className="text-slate-400 text-sm">
                Pago único · Sin suscripción · Acceso inmediato
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-2">
                {SISTEMICAR_CATEGORY.name.toUpperCase()}
              </h1>
              <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
                {SISTEMICAR_CATEGORY.oneLiner}
              </p>
              <p className="text-[10px] text-slate-600 mt-2 italic max-w-md mx-auto">
                {SISTEMICAR_CATEGORY.notA}
              </p>
            </>
          )}
        </header>

        {activeSellerRef && !isEspejoProduct && (
          <div className="mb-6 p-3 rounded-xl border text-center text-[10px]" style={{ borderColor: `${GOLD}30`, backgroundColor: `${GOLD}08`, color: GOLD }}>
            Referido por vendedor: <span className="font-black">{activeSellerRef}</span>
          </div>
        )}

        {isEspejoProduct && (
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-6 border-2 mb-6"
              style={{ backgroundColor: `${WARM_ROSE}08`, borderColor: `${WARM_ROSE}30` }}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${WARM_ROSE} 0%, ${GOLD} 100%)` }}>
                  <Heart size={32} className="text-white" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-slate-500 line-through text-lg">S/ 97.00</span>
                  <span className="text-4xl font-black" style={{ color: GOLD }}>$17</span>
                </div>
                <p className="text-xs text-slate-500">Equivalente a S/ 58.08 · Pago único</p>
              </div>

              <div className="space-y-3 mb-6">
                {ESPEJO_BENEFITS.map((benefit, i) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${benefit.color}15` }}>
                        <Icon size={16} style={{ color: benefit.color }} />
                      </div>
                      <span className="text-slate-300">{benefit.text}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4 mb-6"
            >
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Elige tu método de pago</p>

              <div className="rounded-2xl p-5 border-2 text-center" style={{ backgroundColor: "rgba(96, 40, 143, 0.08)", borderColor: "rgba(96, 40, 143, 0.4)" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(96, 40, 143, 0.2)" }}>
                    <Smartphone size={20} style={{ color: "#60288F" }} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white text-sm">Yape</p>
                    <p className="text-[10px] text-slate-500">Perú · Pago instantáneo</p>
                  </div>
                </div>
                <img src={yapeQrImage} alt="QR Yape" className="w-44 h-44 mx-auto rounded-lg mb-3" />
                <p className="text-sm font-bold text-white">N° 918260514</p>
                <p className="text-xs text-slate-400 mb-3">Gilson Arevalo Pezo</p>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola Gilson, acabo de pagar El Corazón Sabio ($17) por Yape. Mi correo es: ")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-white text-xs transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <MessageCircle size={14} />
                  Confirmar pago por WhatsApp
                </a>
              </div>

              <a
                href={`${PAYPAL_LINK}/17USD`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl p-5 border-2 transition-all hover:scale-[1.01]"
                style={{ backgroundColor: "rgba(59, 130, 246, 0.05)", borderColor: "rgba(59, 130, 246, 0.3)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(59, 130, 246, 0.2)" }}>
                    <CreditCard size={20} className="text-blue-400" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-white text-sm">PayPal</p>
                    <p className="text-[10px] text-slate-500">Internacional · $17 USD</p>
                  </div>
                  <ExternalLink size={16} className="text-slate-500" />
                </div>
              </a>

              <button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/mercadopago/create-preference", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ planId: "corazon-sabio", email: localStorage.getItem("userEmail") || undefined, sellerRef: getSellerRef() || undefined })
                    });
                    const data = await response.json();
                    if (data.initPoint) {
                      window.location.href = data.initPoint;
                    } else {
                      toast.error("Error al conectar con MercadoPago");
                    }
                  } catch {
                    toast.error("Error al procesar. Intenta otro método.");
                  }
                }}
                className="w-full rounded-2xl p-5 border-2 transition-all hover:scale-[1.01] text-left"
                style={{ backgroundColor: "rgba(59, 130, 246, 0.05)", borderColor: "rgba(59, 130, 246, 0.3)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(59, 130, 246, 0.2)" }}>
                    <CreditCard size={20} className="text-blue-300" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">MercadoPago</p>
                    <p className="text-[10px] text-slate-500">Tarjetas, débito · S/ 58.08</p>
                  </div>
                  <ExternalLink size={16} className="text-slate-500" />
                </div>
              </button>

              <p className="text-[10px] text-slate-500 text-center">Después de pagar con Yape o PayPal, envía tu comprobante por WhatsApp para activar tu acceso</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <Link href="/ventas-espejo" className="text-sm text-slate-500 hover:text-white transition-colors">
                ← Volver a la página del Espejo
              </Link>
            </motion.div>
          </div>
        )}

        {!isEspejoProduct && (<>
        {/* Espejo — pago único */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Heart size={16} style={{ color: WARM_ROSE }} />
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Espejo</h2>
          </div>
          <motion.button
            onClick={() => navigate("/pagos?producto=espejo")}
            whileHover={{ scale: 1.01 }}
            className="w-full p-5 rounded-2xl border-2 text-left transition-all"
            style={{ borderColor: `${WARM_ROSE}40`, backgroundColor: `${WARM_ROSE}08` }}
            data-testid="section-espejo"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: `${WARM_ROSE}20` }}>
                  <Heart size={22} style={{ color: WARM_ROSE }} />
                </div>
                <div>
                  <h3 className="font-bold text-white">El Corazón Sabio™</h3>
                  <p className="text-[11px] text-slate-400">Doctor IA · 10 créditos · Pago único</p>
                  {espejoPlan.roiCopy && (
                    <p className="text-[10px] text-slate-500 mt-1 italic">{espejoPlan.roiCopy}</p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-2xl font-black text-white">$17</span>
                <p className="text-[10px] text-slate-500">S/ 58.08</p>
              </div>
            </div>
          </motion.button>
        </section>

        {/* Planificación mensual */}
        <section className="mb-10">
          <CategoriaSistemicarBanner />

          <div className="flex items-center gap-2 mb-4">
            <Compass size={16} style={{ color: GOLD }} />
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Planificación · Mensual</h2>
          </div>

          {/* Embudo — autodiagnóstico */}
          <div className="mb-6 p-4 rounded-xl border border-white/10 bg-black/30">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 text-center">
              ¿En qué peldaño estás?
            </p>
            <div className="space-y-3">
              {EMBUDO_PREGUNTAS.map((item) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{ backgroundColor: `${GOLD}20`, color: GOLD }}
                  >
                    {item.peldaño}
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-slate-300">{item.pregunta}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{item.si}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stacks orientación */}
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 text-center">
              Stacks recomendados
            </p>
            <div className="grid md:grid-cols-3 gap-3">
              {STACKS.map((stack) => (
                <div
                  key={stack.id}
                  className="p-4 rounded-xl border border-white/10 bg-card/50 flex flex-col gap-2"
                  data-testid={`stack-${stack.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">{stack.title}</h3>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wide">{stack.subtitle}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{stack.modules}</p>
                    </div>
                    <span className="text-lg font-black flex-shrink-0" style={{ color: stack.color }}>
                      ~${stack.totalUsd.toFixed(2)}
                      <span className="text-[10px] font-normal text-slate-500">/mes</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{stack.desc}</p>
                  {stack.addOnId ? (
                    <>
                      <p className="text-[9px] text-slate-600">
                        Incluye Base (${SKU_BASE.priceUsd}) + add-on. Apilado mensual.
                      </p>
                      <button
                        type="button"
                        onClick={() => selectStack(stack.addOnId!)}
                        className="w-full py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all hover:opacity-90"
                        style={{ backgroundColor: `${stack.color}20`, color: stack.color, border: `1px solid ${stack.color}40` }}
                      >
                        Seleccionar add-on
                      </button>
                    </>
                  ) : (
                    <p className="text-[9px] text-slate-500 italic">
                      Usuario comprometido: Base + Ritmo + Norte ≈ ${PLANIFICACION_FULL_MONTHLY_USD}/mes
                      (tres capas apiladas).
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          {planificacionPlans.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan.id === plan.id;
            
            return (
              <motion.button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`select-plan-${plan.id}`}
                className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-white/10 hover:border-white/20 bg-card"
                }`}
                style={{
                  borderColor: isSelected ? plan.color : undefined,
                  background: isSelected ? `${plan.color}15` : undefined
                }}
              >
                {plan.popular && (
                  <div 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-black"
                    style={{ background: plan.color }}
                  >
                    Más Popular
                  </div>
                )}
                {plan.badge && (
                  <div 
                    className="absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-black"
                    style={{ background: plan.color }}
                  >
                    {plan.badge}
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ background: `${plan.color}20` }}
                  >
                    <Icon size={24} style={{ color: plan.color }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                    {plan.peldaño && (
                      <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: plan.color }}>
                        {plan.peldaño}
                      </p>
                    )}
                    {plan.forWho && (
                      <span
                        className="inline-block mt-1 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${plan.color}20`, color: plan.color }}
                      >
                        {plan.forWho}
                      </span>
                    )}
                  </div>
                </div>

                {plan.funnelHint && (
                  <p className="text-[9px] font-bold uppercase tracking-wide mb-2" style={{ color: plan.color }}>
                    {plan.funnelHint}
                  </p>
                )}

                {plan.anchorCopy && (
                  <p className="text-[11px] text-slate-400 italic mb-2 leading-relaxed">{plan.anchorCopy}</p>
                )}

                {plan.roiCopy && (
                  <div
                    className="flex items-start gap-2 p-2 rounded-lg mb-3"
                    style={{ backgroundColor: `${plan.color}08`, border: `1px solid ${plan.color}20` }}
                  >
                    <TrendingUp size={12} className="flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                    <p className="text-[10px] leading-relaxed" style={{ color: plan.color }}>{plan.roiCopy}</p>
                  </div>
                )}
                
                <div className="mb-4">
                  <span className="text-3xl font-black text-white">${plan.price}</span>
                  <span className="text-slate-500 text-sm">{plan.isOneTime ? " pago único" : "/mes"}</span>
                  {!plan.isOneTime && (
                    <p className="text-[10px] text-slate-600 mt-0.5">S/ {plan.pricePEN.toFixed(0)} soles</p>
                  )}
                </div>
                
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <span className="flex items-center gap-2" style={{ color: feature.highlight ? plan.color : "#cbd5e1", fontWeight: feature.highlight ? 700 : 400 }}>
                        <Check size={14} style={{ color: plan.color }} />
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
                
                {isSelected && (
                  <motion.div
                    layoutId="selected-indicator"
                    className="absolute inset-0 rounded-2xl border-2 pointer-events-none"
                    style={{ borderColor: plan.color }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-600 text-center mb-8 leading-relaxed px-2">
          Comparado con apps de notas (~$10/mes): aquí pagas por unidades, ritmo y cierre de bloque — no por listas.
        </p>
        </section>

        {/* Ecosistema — en camino */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Map size={16} className="text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Ecosistema Sistemicar</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {MODULOS_EN_CAMINO.map((mod) => (
              <div
                key={mod.id}
                className="p-4 rounded-xl border border-white/10 bg-card/50"
                data-testid={`modulo-en-camino-${mod.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-white">{mod.nombre}</h3>
                  <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "rgba(100,116,139,0.2)", color: "#94a3b8" }}>
                    {BADGE_EN_CAMINO}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{mod.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Payment Method Selection */}
        <div ref={paymentSectionRef} className="p-6 rounded-2xl bg-card border border-white/10 mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Método de pago
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setPaymentMethod("mercadopago")}
              data-testid="select-mercadopago"
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                paymentMethod === "mercadopago"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <CreditCard className="text-blue-400" size={28} />
              <div className="text-center">
                <p className="font-bold text-white text-sm">Mercado Pago</p>
                <p className="text-[9px] text-slate-500">Tarjetas, débito</p>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod("paypal")}
              data-testid="select-paypal"
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                paymentMethod === "paypal"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <CreditCard className="text-blue-300" size={28} />
              <div className="text-center">
                <p className="font-bold text-white text-sm">PayPal</p>
                <p className="text-[9px] text-slate-500">Internacional</p>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod("yape")}
              data-testid="select-yape"
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                paymentMethod === "yape"
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <Smartphone className="text-purple-400" size={28} />
              <div className="text-center">
                <p className="font-bold text-white text-sm">Yape</p>
                <p className="text-[9px] text-slate-500">Perú</p>
              </div>
            </button>
          </div>
        </div>

        {/* Payment Details by Method */}
        <AnimatePresence mode="wait">
          {paymentMethod === "mercadopago" && (
            <motion.div
              key="mercadopago"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/30 to-slate-900/50 border border-blue-500/30 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Plan {selectedPlan.name}</h3>
                  <p className="text-sm text-slate-400">Pago con Mercado Pago</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white">${selectedPlan.price}</p>
                  <p className="text-xs text-slate-500">{selectedPlan.isOneTime ? "USD · pago único" : "USD/mes"}</p>
                </div>
              </div>

              <button
                onClick={handleMercadoPago}
                disabled={loading}
                data-testid="pay-mercadopago"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-lg hover:from-blue-400 hover:to-cyan-400 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles size={20} />
                  </motion.div>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Pagar ${selectedPlan.price} USD
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-500 mt-4">
                Tarjetas de crédito, débito, efectivo en agentes
              </p>
            </motion.div>
          )}

          {paymentMethod === "paypal" && (
            <motion.div
              key="paypal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/30 to-slate-900/50 border border-blue-500/30 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Plan {selectedPlan.name}</h3>
                  <p className="text-sm text-slate-400">Pago con PayPal</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white">${selectedPlan.price}</p>
                  <p className="text-xs text-slate-500">USD</p>
                </div>
              </div>

              <button
                onClick={openPayPal}
                data-testid="paypal-pay-button"
                className="w-full py-4 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-400 transition-colors flex items-center justify-center gap-2 mb-4"
              >
                <CreditCard size={20} />
                Pagar ${selectedPlan.price} USD con PayPal
                <ExternalLink size={16} />
              </button>

              <div className="border-t border-white/10 my-6 pt-6">
                <p className="text-sm text-white font-bold text-center mb-4">
                  ¿Ya realizaste el pago?
                </p>
                
                <div className="mb-4">
                  <label className="block text-xs text-slate-400 mb-2">
                    Tu correo electrónico (para activar tu cuenta):
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    data-testid="input-email-paypal"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={openWhatsApp}
                  data-testid="send-receipt-paypal"
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold hover:from-green-400 hover:to-emerald-500 transition-all flex items-center justify-center gap-3"
                >
                  <MessageCircle size={20} />
                  ENVIAR COMPROBANTE POR WHATSAPP
                </button>
              </div>
            </motion.div>
          )}

          {paymentMethod === "yape" && (
            <motion.div
              key="yape"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/30 to-slate-900/50 border border-purple-500/30 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Plan {selectedPlan.name}</h3>
                  <p className="text-sm text-slate-400">Pago con Yape</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white">S/ {selectedPlan.pricePEN.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">Soles</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 mb-6">
                <p className="text-center text-black font-bold mb-4">Yapea al número:</p>
                <p className="text-center text-3xl font-black text-purple-600 mb-2">918 260 514</p>
                <p className="text-center text-sm text-gray-500">Gilson Arevalo</p>
              </div>

              <div className="border-t border-white/10 my-6 pt-6">
                <p className="text-sm text-white font-bold text-center mb-4">
                  ¿Ya realizaste el Yape?
                </p>
                
                <div className="mb-4">
                  <label className="block text-xs text-slate-400 mb-2">
                    Tu correo electrónico (para activar tu cuenta):
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    data-testid="input-email-yape"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={openWhatsApp}
                  data-testid="send-receipt-yape"
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold hover:from-green-400 hover:to-emerald-500 transition-all flex items-center justify-center gap-3"
                >
                  <MessageCircle size={20} />
                  ENVIAR COMPROBANTE POR WHATSAPP
                </button>
              </div>
            </motion.div>
          )}

          {!paymentMethod && (
            <motion.div
              key="no-method"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 rounded-2xl border border-dashed border-white/20 text-center mb-8"
            >
              <p className="text-slate-500">Selecciona un método de pago arriba</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manifiesto Sistemicar */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl overflow-hidden mb-12"
          style={{
            background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
            border: '1px solid rgba(212, 175, 55, 0.2)'
          }}
        >
          <div className="p-8 md:p-12">
            <h2 
              className="text-2xl md:text-3xl font-bold text-center mb-2"
              style={{ 
                fontFamily: "'Playfair Display', serif",
                color: GOLD
              }}
            >
              Manifiesto Sistemicar
            </h2>
            <p className="text-center text-slate-500 text-sm mb-8 tracking-widest uppercase">
              El Fin de la Mente de Pato
            </p>

            <div className="space-y-6 text-slate-300 leading-relaxed">
              <p className="text-sm md:text-base">
                Durante décadas, nos han vendido la ilusión de la "autoayuda". <span className="text-white font-semibold">Nos mintieron.</span> El sistema tradicional solo pone parches a una mente que sigue siendo dependiente, frágil y olvidadiza.
              </p>
              
              <p className="text-sm md:text-base">
                Hoy, ese viejo paradigma ha muerto. Bienvenidos a la era de la <span style={{ color: GOLD }} className="font-bold">Ingeniería de la Identidad</span>. Bienvenidos a Sistemicar.
              </p>

              <div 
                className="my-8 p-6 rounded-xl"
                style={{ 
                  background: 'rgba(212, 175, 55, 0.05)',
                  borderLeft: `3px solid ${GOLD}`
                }}
              >
                <h3 className="font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                  No buscamos la paz, buscamos la Fricción
                </h3>
                <p className="text-sm text-slate-400">
                  Solo a través de la <span className="text-white">Fricción Neuronal</span> se transmuta la debilidad en Poder.
                </p>
              </div>

              <div className="text-center py-4">
                <p 
                  className="text-lg font-bold"
                  style={{ 
                    fontFamily: "'Playfair Display', serif",
                    color: GOLD
                  }}
                >
                  "Eres el arquitecto de tu alba."
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Footer Legal */}
        <footer className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <p>
              Al suscribirte aceptas los{" "}
              <Link href="/terminos-condiciones" className="text-primary hover:underline">
                Términos y Condiciones
              </Link>
            </p>
            <div className="flex items-center gap-4">
              <Link href="/libro-reclamaciones" className="hover:text-slate-400 transition-colors">
                Libro de Reclamaciones
              </Link>
              <span>•</span>
              <a href="mailto:info@sistemicar.app" className="hover:text-slate-400 transition-colors">
                Soporte
              </a>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-700 mt-6">
            © 2025 SISTEMICAR. Todos los derechos reservados.
          </p>
        </footer>
        </>)}
      </motion.div>
    </TooltipProvider>
  );
}
