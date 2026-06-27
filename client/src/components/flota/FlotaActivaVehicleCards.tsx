import { memo } from "react";
import type { Planilla, Vehicle } from "@/lib/persistence";
import { MemoVehicleCard } from "@/components/flota/VehicleCard";
import type { SituacionDesgloseSummary } from "@/components/flota/vehicleCardShared";
import type { DesglosadorManagerHandlers } from "@/hooks/useDesglosadorManager";

type Props = {
  flotaActivos: Vehicle[];
  expandedId: string | null;
  cierreEnergiaPendingVehicleId: string | null;
  segmentoNumero: number | null;
  planilla: Planilla | null;
  situacionBloqueSummaries: Record<string, SituacionDesgloseSummary>;
  arquitectoUnlocked: boolean;
  handlers: DesglosadorManagerHandlers;
};

function FlotaActivaVehicleCardsInner({
  flotaActivos,
  expandedId,
  cierreEnergiaPendingVehicleId,
  segmentoNumero,
  planilla,
  situacionBloqueSummaries,
  arquitectoUnlocked,
  handlers: h,
}: Props) {
  return (
    <>
      {flotaActivos.map(v => (
        <MemoVehicleCard
          key={v.id}
          vehicle={v}
          expanded={expandedId === v.id}
          onToggleVehicle={h.handleVehicleToggle}
          onOpenCierreEnergia={h.handleOpenCierreEnergiaStable}
          cierreEnergiaPendingVehicleId={cierreEnergiaPendingVehicleId}
          onCompleteVehicle={h.handleVehicleComplete}
          onArchiveVehicle={h.handleVehicleArchive}
          segmentoNumero={segmentoNumero}
          planilla={planilla}
          onAddSubTarea={h.handleAddSubTarea}
          onAddSubTareaUrgenteACola={h.handleAddSubTareaUrgenteACola}
          onToggleSubTarea={h.handleToggleSubTarea}
          onSetSubTareaMinutosCupo={h.handleSetSubTareaMinutosCupo}
          onExtendSituacionCupo={h.handleExtendSituacionCupo}
          onSyncSituacionCupoAnchor={h.handleSyncSituacionCupoAnchor}
          onMoveSubTareasToCronometro={h.handleMoveSubTareasToCronometro}
          onSituacionCronometroSetHoraFin={h.handleSituacionCronometroSetHoraFin}
          onSituacionCronometroCumplido={h.handleSituacionCronometroCumplido}
          onSituacionCronometroFallado={h.handleSituacionCronometroFallado}
          onSituacionCronometroReservar={h.handleSituacionCronometroReservar}
          onQuitarSituacionCupo={h.handleQuitarSituacionCupo}
          onCerrarSituacionDesgloseBloque={h.handleCerrarSituacionDesgloseBloque}
          onCerrarSituacionDesglosadorDeGolpe={h.handleCerrarSituacionDesglosadorDeGolpe}
          situacionBloquePsTotal={situacionBloqueSummaries[v.id]?.psTotal}
          situacionDesgloseSummary={situacionBloqueSummaries[v.id]}
          onVerSituacionBloquePs={h.handleVerSituacionBloquePsStable}
          onAddDetalle={h.handleAddDetalle}
          onEntregarDetalle={h.handleEntregarDetalle}
          onAddCasaItem={h.handleAddCasaItem}
          onToggleCasaItem={h.handleToggleCasaItem}
          arquitectoUnlocked={arquitectoUnlocked}
          onInvestigadorClose={h.handleInvestigadorClose}
          onDesglosadorUpdate={h.handleDesglosadorUpdate}
          onDesglosadorGlobalClose={h.handleDesglosadorGlobalClose}
          onDesglosadorCierreDeGolpe={h.handleDesglosadorCierreDeGolpe}
          onDesglosadorPausaInterrupcion={h.handleDesglosadorPausaInterrupcion}
          onResumeDesglosador={h.resumeDesglosadorTrasInterrupcion}
          onDesglosadorReorderSubs={h.handleDesglosadorReorderSubs}
          onDesglosadorAddSub={h.handleDesglosadorAddSub}
          onDesglosadorActivatePendingSub={h.handleDesglosadorActivatePendingSub}
          onReorderSubTareasCronometro={h.handleReorderSubTareasCronometro}
          onDescansoClose={h.handleDescansoClose}
          onMicroPasoToggle={h.handleMicroPasoToggle}
          onEtapaPuntoCeroToggle={h.handleEtapaPuntoCeroToggle}
          onPuntoCeroSessionUpdate={h.handlePuntoCeroSessionUpdate}
          onPuntoCeroColorConfirm={h.handlePuntoCeroColorConfirm}
          onPuntoCeroAutoClose={h.handlePuntoCeroAutoClose}
          onRutaBandCross={h.recordRutaBandCross}
          onBloqueCierre={h.recordBloqueCierre}
        />
      ))}
    </>
  );
}

export const FlotaActivaVehicleCards = memo(FlotaActivaVehicleCardsInner);
