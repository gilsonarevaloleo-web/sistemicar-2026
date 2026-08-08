import { ConsolaUmbral } from "@/components/umbral/ConsolaUmbral";
import { useAuthContext } from "@/App";

/**
 * Consola Umbral v2 — UI del motor de 10 Códigos.
 * Spec: umbral v2. tercer parte
 */
export default function UmbralV2() {
  const { user } = useAuthContext();

  if (!user?.uid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white/50">
        Cargando consola…
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
      data-testid="umbral-v2-page"
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
        <ConsolaUmbral userId={user.uid} />
      </div>
    </div>
  );
}
