/** Fallback liviano al abrir un recinto lazy. Sin spinner: el giro se lee como freeze. */
export function HouseRouteFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#020202" }}
      data-testid="house-route-fallback"
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">
        Abriendo recinto…
      </p>
    </div>
  );
}

export default HouseRouteFallback;
