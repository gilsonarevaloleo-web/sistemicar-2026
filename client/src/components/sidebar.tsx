import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  BookOpen,
  Terminal,
  Trophy,
  TrendingUp,
  Compass,
  Sparkles,
  LogOut,
  Shield,
  Users,
  Menu,
  X,
  History,
  Scroll,
  CreditCard,
  Home,
  Flame,
  Camera,
  Radio,
  Zap,
  Sprout,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/session";
import { useAuthContext } from "@/App";
import { subscribeToProgression, UserProgression } from "@/lib/persistence";
import { isOwner } from "@/lib/owner";
import { getUserEmail } from "@/lib/firebase";
import { JORNADA_MODULE } from "@/lib/jornadaBrand";
import { NavTransitionLink } from "@/components/NavTransitionLink";

type NavItem = { path: string; icon: React.ElementType; label: string };

function MobileNavSection({
  title,
  items,
  location,
  onNavigate,
  accentClass,
}: {
  title: string;
  items: NavItem[];
  location: string;
  onNavigate: () => void;
  accentClass?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 px-1">{title}</p>
      <div className="grid grid-cols-4 gap-3">
        {items.map((item) => {
          const isActive = location === item.path;
          return (
            <NavTransitionLink key={item.path} href={item.path} onClick={onNavigate}>
              <div className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-white/5">
                <item.icon
                  size={22}
                  className={cn(isActive ? accentClass || "text-primary" : "text-slate-400")}
                />
                <span
                  className={cn(
                    "text-[10px] text-center leading-tight",
                    isActive ? accentClass || "text-primary" : "text-slate-400"
                  )}
                >
                  {item.label}
                </span>
              </div>
            </NavTransitionLink>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuthContext();
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const userEmail = getUserEmail();

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToProgression(
      user.uid,
      (prog) => {
        setProgression(prog);
      },
      (e) => console.error("[Sidebar] progression:", e)
    );
    return () => unsub();
  }, [user?.uid]);

  const esArquitecto = progression?.rank === "arquitecto" || isOwner(userEmail);
  const esOwner = isOwner(userEmail);

  const baseNavItems: NavItem[] = [
    { path: "/menu", icon: Home, label: "Menú" },
    { path: "/espejo", icon: Terminal, label: "Espejo" },
    { path: "/manuales", icon: BookOpen, label: "Manuales" },
    { path: "/pagos", icon: CreditCard, label: "Pagos" },
    { path: "/acerca", icon: Scroll, label: "Manifiesto" },
  ];

  const arquitectoModuleItems: NavItem[] = [
    { path: "/menu", icon: Home, label: "Menú" },
    { path: "/espejo", icon: Terminal, label: "Espejo" },
    { path: "/radar", icon: Radio, label: "Radar" },
    { path: "/alquimia", icon: Flame, label: "Sabiduría" },
    { path: "/planeacion", icon: Compass, label: JORNADA_MODULE.title },
    { path: "/proyectos", icon: Layers, label: "Proyectos" },
    { path: "/esperanza", icon: Sparkles, label: "Esperanza" },
    { path: "/analytics", icon: TrendingUp, label: "Analytics" },
    { path: "/rewards", icon: Trophy, label: "Beneficios" },
    { path: "/camara", icon: Camera, label: "Cámara" },
    { path: "/historial", icon: History, label: "Historia" },
    { path: "/acerca", icon: Scroll, label: "Manifiesto" },
    { path: "/pagos", icon: CreditCard, label: "Pagos" },
  ];

  const arquitectoLibrosItems: NavItem[] = [
    { path: "/manuales", icon: BookOpen, label: "Manuales" },
    { path: "/codice", icon: Shield, label: "Códice" },
    { path: "/umbral", icon: Zap, label: "Umbral" },
  ];

  const navItems = esArquitecto ? [...arquitectoModuleItems, ...arquitectoLibrosItems] : baseNavItems;

  const adminItems: NavItem[] = esOwner
    ? [
        { path: "/admin-gilson", icon: Shield, label: "Admin" },
        { path: "/admin-semillas", icon: Sprout, label: "Semillas" },
        { path: "/socios", icon: Users, label: "Socios" },
      ]
    : [];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-20 flex-col items-center py-10 glass z-50 border-r border-white/5">
        <div className="mb-12">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-black text-white italic font-display text-xl shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            S
          </div>
        </div>

        <div className="flex flex-col gap-6 w-full px-2 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <NavTransitionLink key={`${item.path}-${item.label}`} href={item.path}>
                <div className="relative group flex justify-center w-full cursor-pointer" title={item.label}>
                  <div
                    className={cn(
                      "p-3 rounded-xl transition-all duration-300 relative z-10",
                      isActive
                        ? "text-white bg-white/10"
                        : "text-slate-500 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-desktop"
                      className="absolute inset-0 bg-white/5 rounded-xl border border-white/5"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
              </NavTransitionLink>
            );
          })}
        </div>

        <div className="mt-auto mb-4 w-full px-2 flex flex-col gap-4">
          {adminItems.length > 0 && (
            <>
              <div className="w-full h-px bg-white/10" />
              {adminItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <NavTransitionLink key={item.path} href={item.path}>
                    <div className="relative group flex justify-center w-full cursor-pointer">
                      <div
                        className={cn(
                          "p-3 rounded-xl transition-all duration-300 relative z-10",
                          isActive
                            ? "text-amber-400 bg-amber-500/10"
                            : "text-slate-600 hover:text-amber-400 hover:bg-amber-500/5"
                        )}
                        title={item.label}
                      >
                        <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                    </div>
                  </NavTransitionLink>
                );
              })}
            </>
          )}
          <button
            onClick={logout}
            className="w-full flex justify-center p-3 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
            title="Cerrar sesión"
            data-testid="button-logout-desktop"
          >
            <LogOut size={24} strokeWidth={2} />
          </button>
        </div>
      </nav>

      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={closeMobileMenu}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="absolute bottom-20 left-0 right-0 bg-[#0a0c14] border-t border-white/10 rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {esArquitecto ? (
                <>
                  <MobileNavSection
                    title="Módulos"
                    items={arquitectoModuleItems}
                    location={location}
                    onNavigate={closeMobileMenu}
                  />
                  <MobileNavSection
                    title="Libros"
                    items={arquitectoLibrosItems}
                    location={location}
                    onNavigate={closeMobileMenu}
                    accentClass="text-amber-400"
                  />
                  {adminItems.length > 0 && (
                    <MobileNavSection
                      title="Admin"
                      items={adminItems}
                      location={location}
                      onNavigate={closeMobileMenu}
                      accentClass="text-amber-400"
                    />
                  )}
                </>
              ) : (
                <MobileNavSection
                  title="Navegación"
                  items={baseNavItems}
                  location={location}
                  onNavigate={closeMobileMenu}
                />
              )}
              <button
                onClick={() => {
                  logout();
                  closeMobileMenu();
                }}
                className="w-full mt-2 py-3 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium"
              >
                Cerrar Sesión
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-black/95 backdrop-blur-2xl z-50 border-t border-white/5 flex items-center justify-around px-2">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#A855F7] via-[#3B82F6] via-[#EF4444] to-[#7C3AED]" />

        {(() => {
          const mobileItems = esArquitecto
            ? [
                { path: "/menu", icon: Home, label: "Menú", color: "#A855F7" },
                { path: "/espejo", icon: Terminal, label: "Espejo", color: "#3B82F6" },
                { path: "/alquimia", icon: Flame, label: "Sabiduría", color: "#EF4444" },
                { path: "/planeacion", icon: Compass, label: "Plan", color: "#7C3AED" },
              ]
            : [
                { path: "/menu", icon: Home, label: "Menú", color: "#A855F7" },
                { path: "/espejo", icon: Terminal, label: "Espejo", color: "#3B82F6" },
                { path: "/manuales", icon: BookOpen, label: "Libros", color: "#D4AF37" },
                { path: "/pagos", icon: CreditCard, label: "Upgrade", color: "#D4AF37" },
              ];

          return mobileItems.map((item) => {
            const isActive = location === item.path;
            return (
              <NavTransitionLink key={item.path} href={item.path}>
                <div className="relative flex flex-col items-center justify-center cursor-pointer p-2">
                  <div
                    className={cn(
                      "p-2 rounded-xl transition-all duration-300 relative z-10",
                      isActive && "scale-110"
                    )}
                    style={{
                      color: isActive ? item.color : "rgb(71 85 105)",
                    }}
                  >
                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && (
                      <motion.div
                        layoutId="nav-glow"
                        className="absolute -inset-1 rounded-xl opacity-30 blur-md"
                        style={{ backgroundColor: item.color }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </div>
                </div>
              </NavTransitionLink>
            );
          });
        })()}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="relative flex flex-col items-center justify-center cursor-pointer p-2"
        >
          <div
            className={cn(
              "p-2 rounded-xl transition-all duration-300",
              mobileMenuOpen ? "text-white" : "text-slate-600"
            )}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </div>
        </button>
      </nav>
    </>
  );
}
