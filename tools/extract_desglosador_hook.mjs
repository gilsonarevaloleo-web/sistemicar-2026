import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PLANEACION = path.join(ROOT, "client/src/pages/planeacion.tsx");
const HOOK = path.join(ROOT, "client/src/hooks/useDesglosadorManager.ts");

/** 1-based inclusive line ranges to extract from Planeacion body */
const RANGES = [
  [752, 755],
  [765, 765],
  [766, 768],
  [779, 781],
  [788, 789],
  [917, 948],
  [957, 986],
  [1030, 1049],
  [1051, 1075],
  [1077, 1142],
  [1295, 1339],
  [1361, 1369],
  [1647, 1680],
  [1726, 2055],
  [3040, 4377],
  [4427, 5996],
  [5998, 6042],
  [6110, 6127],
];

const HOOK_IMPORTS = fs.readFileSync(path.join(__dirname, "desglosador_hook_imports.ts.txt"), "utf8");
const FOOTER = fs.readFileSync(path.join(__dirname, "desglosador_hook_footer.ts.txt"), "utf8");
const SAVE_VEHICLE_HISTORY = fs.readFileSync(path.join(__dirname, "saveVehicleHistory.ts.txt"), "utf8");

const STUB_EJES = `const STUB_EJES = { enfoque: { text: "", trifecta: "omitir" as const }, conflicto: { text: "", trifecta: "omitir" as const }, pasos: { text: "", trifecta: "omitir" as const }, limite: { text: "", trifecta: "omitir" as const } };`;

const TIME_HELPERS = `
function parseTimeString(t: string): { h: number; m: number } | null {
  const match = t.match(/^(\\d{1,2}):(\\d{2})$/);
  if (!match) return null;
  return { h: parseInt(match[1]), m: parseInt(match[2]) };
}

function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function timeStringToMinutes(t: string): number {
  const parsed = parseTimeString(t);
  if (!parsed) return 0;
  return parsed.h * 60 + parsed.m;
}
`;

const PLANILLA_BLOCK = `
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const planillaFecha = getJournalDateString();

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToPlanilla(user.uid, planillaFecha, (p) => setPlanilla(p), (e) => console.error(e));
    return unsub;
  }, [user, planillaFecha]);

  const segmentoActivo = useMemo(() => {
    if (!planilla) return null;
    return planilla.segmentos.find(s => s.estado === "activo") || null;
  }, [planilla]);

  const { proyectosHub, resolverProyectoId } = useSegmentoProyectoVinculo(user?.uid, segmentoActivo);

  const imanProyectos = useMemo(
    () =>
      proyectosHub.map(p => ({
        id: p.id,
        titulo: p.titulo,
        etiqueta: p.etiqueta,
        color: p.color,
      })),
    [proyectosHub]
  );

  const showEntropyDebug = useMemo(() => isEntropyDebugEnabled(), []);

  useEffect(() => {
    try {
      repairStuckSituacionVehicles();
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToSituacionReserva(user.uid, setSituacionReserva, e => console.error(e));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setupFlotaSubscription();
    return () => cancelFlotaFetch();
  }, [user, setupFlotaSubscription]);
`;

function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

const content = fs.readFileSync(PLANEACION, "utf8");
const lines = content.split("\n");

let innerParts = [];
for (const [start, end] of RANGES) {
  innerParts.push(lines.slice(start - 1, end).join("\n"));
}
let inner = innerParts.join("\n");

inner = inner.replace(
  /const \{ vehicles, setVehicles \} = \{[\s\S]*?useFlotaMutator\(\),\s*\};/,
  ""
);
inner = inner.replace(/const deferredVehicles = useDeferredValue\(vehicles\);?\n?/, "");
inner = inner.replace(/const flotaActivosRenderList = useMemo/g, "const flotaActivos = useMemo");
inner = inner.replace(/flotaActivosRenderList/g, "flotaActivos");
inner = inner.replace(/triggerConquistaPulse\(\)/g, "options?.onConquistaPulse?.()");
inner = inner.replace(
  /setDailyPS\(getDailyPointsLocalSync\(user\.uid\)\.total\)/g,
  "options?.onDailyPsChange?.(getDailyPointsLocalSync(user.uid).total)"
);
inner = inner.replace(/onDailyPs: setDailyPS/g, "onDailyPs: (total) => options?.onDailyPsChange?.(total)");
inner = inner.replace(
  /setGoldenFlash\(true\);\s*\n\s*setTimeout\(\(\) => setGoldenFlash\(false\), 3000\);/g,
  "options?.onGoldenFlash?.();"
);
inner = inner.replace(
  /setGoldenFlash\(true\);\s*\n\s*setTimeout\(\(\) => setGoldenFlash\(false\), 2500\);/g,
  "options?.onGoldenFlash?.();"
);

const hookBody =
  `export type UseDesglosadorManagerOptions = {\n` +
  `  onDailyPsChange?: (total: number) => void;\n` +
  `  onConquistaPulse?: () => void;\n` +
  `  onGoldenFlash?: () => void;\n` +
  `};\n\n` +
  `export function useDesglosadorManager(options?: UseDesglosadorManagerOptions) {\n` +
  `  const { user } = useAuthContext();\n` +
  PLANILLA_BLOCK +
  `\n  const vehicles = useFlotaVehiclesShallow(user?.uid);\n` +
  `  const setVehicles = useFlotaMutator();\n` +
  inner +
  `\n` +
  FOOTER;

const hookFile =
  HOOK_IMPORTS +
  "\n" +
  SAVE_VEHICLE_HISTORY +
  "\n" +
  STUB_EJES +
  "\n" +
  TIME_HELPERS +
  "\n\n" +
  hookBody;

fs.writeFileSync(HOOK, hookFile, "utf8");
console.log(`Wrote ${HOOK} (${hookFile.split("\n").length} lines)`);

const merged = mergeRanges(RANGES).sort((a, b) => b[0] - a[0]);
let newLines = [...lines];
for (const [start, end] of merged) {
  newLines.splice(start - 1, end - start + 1);
}

fs.writeFileSync(PLANEACION, newLines.join("\n"), "utf8");
console.log(`Removed ${RANGES.length} blocks from planeacion (${newLines.length} lines remain)`);
