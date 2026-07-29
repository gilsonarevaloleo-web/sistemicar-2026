import { ReactNode } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./sidebar";
import { PageHeader } from "./page-header";
import { PageContainer } from "./page-container";
import { Link } from "wouter";

const pagesWithHeader = ["/espejo", "/jornada-v4", "/esperanza", "/analytics", "/rewards", "/tutorial", "/historial"];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const showHeader = pagesWithHeader.includes(location);
  
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Reduced noise opacity for cleaner look matching screenshots */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none z-0 mix-blend-overlay"></div>
      
      <Sidebar />
      
      {/* 
        Mobile: No margin left, full width. Bottom padding for scroll.
        Desktop: ml-20 for sidebar.
      */}
      <main className="w-full md:ml-20 min-h-screen relative z-10 flex flex-col">
        {showHeader && <PageHeader />}
        <div className="flex-1">
          {children}
        </div>
        
        {/* Footer with Creator Credit */}
        <footer className="w-full py-6 px-4 border-t border-white/5 bg-card/50 backdrop-blur-sm">
          <PageContainer className="text-center space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">
              Filosofía DDN creada por
            </p>
            <p className="text-sm font-bold text-white">
              Gilson Arévalo
            </p>
            <Link href="/acerca" className="text-[10px] text-primary hover:text-primary/80 transition-colors">
              Conocer más sobre la filosofía
            </Link>
            <p className="text-[9px] text-slate-600 mt-2">
              © {new Date().getFullYear()} SISTEMICAR - Todos los derechos reservados
            </p>
          </PageContainer>
        </footer>
      </main>
    </div>
  );
}
