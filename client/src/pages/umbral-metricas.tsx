import { PanelMetricasUmbral } from "@/components/umbral/PanelMetricasUmbral";
import { useAuthContext } from "@/App";

/**
 * Panel de métricas diagnósticas Umbral v2.
 */
export default function UmbralMetricas() {
  const { user } = useAuthContext();

  if (!user?.uid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white/50">
        Cargando métricas…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-[#E8E8E8]"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% -10%, #141820 0%, #0A0A0A 42%, #050505 100%)",
      }}
      data-testid="umbral-metricas-page"
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,175,55,0.45) 3px)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-4 py-6 pb-28 sm:py-10">
        <PanelMetricasUmbral userId={user.uid} />
      </div>
    </div>
  );
}
