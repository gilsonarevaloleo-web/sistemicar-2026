/**
 * Sesión Dual Kernel — ops + lista. Lazy desde jornadaV4 entry.
 */
import { useAuthContext } from "@/App";
import { Jornada4Shell } from "@/components/jornada4/Jornada4Shell";
import { Jornada4VehicleList } from "@/components/jornada4/Jornada4VehicleList";
import { useJornada4Core } from "@/hooks/useJornada4Core";
import { useJornada4Ops } from "@/hooks/useJornada4Ops";

export default function JornadaV4Session() {
  const { user } = useAuthContext();
  const core = useJornada4Core();
  const ops = useJornada4Ops({
    userId: user?.uid,
    vehiclesRef: core.vehiclesRef,
    setVehicles: core.setVehicles,
    safeAwardPS: core.safeAwardPS,
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0b0f0c" }} data-testid="jornada4-session">
      <Jornada4Shell
        dualCount={core.dualCount}
        dailyPS={core.dailyPS}
        statusLine="Operando · ms0 + sombra"
      />
      <div className="max-w-lg mx-auto pt-2">
        <Jornada4VehicleList vehicles={core.dualVehicles} ops={ops} />
      </div>
    </div>
  );
}
