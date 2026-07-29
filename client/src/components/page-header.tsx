import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Terminal, 
  Compass, 
  Sparkles, 
  TrendingUp, 
  Trophy, 
  BookOpen,
  ChevronRight,
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageContainer } from "./page-container";
import { JORNADA_MODULE } from "@/lib/jornadaBrand";

const pageInfo: Record<string, { title: string; subtitle: string; icon: any }> = {
  "/espejo": { title: "Espejo", subtitle: "Alquimia Clínica del Corazón", icon: Terminal },
  "/jornada-v4": { title: JORNADA_MODULE.title, subtitle: JORNADA_MODULE.tagline, icon: Compass },
  "/esperanza": { title: "Depósito", subtitle: "Batería de Certeza", icon: Sparkles },
  "/analytics": { title: "Analytics", subtitle: "Tus patrones de energía", icon: TrendingUp },
  "/rewards": { title: "Beneficios", subtitle: "Desbloquea recompensas", icon: Trophy },
  "/tutorial": { title: "Manual", subtitle: "Protocolo de operaciones", icon: BookOpen },
  "/historial": { title: "Historia", subtitle: "Log con expandir/reducir", icon: Terminal },
};

export function PageHeader() {
  const [location, navigate] = useLocation();
  const info = pageInfo[location];
  
  const isLoggedIn = !!localStorage.getItem("userId");
  
  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userToken");
    navigate("/bienvenida");
  };
  
  if (!info) return null;
  
  const Icon = info.icon;
  
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 px-4 py-3"
    >
      <PageContainer className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Icon size={20} className="text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link href="/menu">
                <span className="text-[10px] text-slate-500 hover:text-primary transition-colors cursor-pointer">SISTEMICAR</span>
              </Link>
              <ChevronRight size={10} className="text-slate-600" />
              <h1 className="text-sm font-bold text-white uppercase tracking-wider">{info.title}</h1>
            </div>
            <p className="text-[10px] text-slate-500">{info.subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
              title="Cerrar sesion"
            >
              <LogOut size={16} />
            </button>
          ) : (
            <button
              onClick={() => navigate("/bienvenida")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/30 transition-colors"
            >
              <User size={14} />
              Entrar
            </button>
          )}
        </div>
      </PageContainer>
    </motion.header>
  );
}
