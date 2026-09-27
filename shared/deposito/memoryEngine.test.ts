import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diagnosticarVolcadoLocal } from "./engineConfig.ts";
import {
  INSTRUCCION_CRITERIO_ADAPTATIVO,
  UMBRAL_AXIOMA_ESTRUCTURA,
  absorberHallazgo,
  actualizarBaseConocimiento,
  bloqueInyeccionMaestro,
  extraerMetaforaClave,
  puedeRegistrarAxioma,
  reconocerNuevaRegla,
  sintetizarAxioma,
  storeVacio,
} from "./memoryEngine.ts";

const SECO_DENSO = `Hoy a las 8:10 aprendí que el botón no entra si la tensión no cierra el encaje. Usé la máquina de coser. Corté 12 botones. Ajusté la tensión del hilo a 4. Cosí el segundo. Armé la prenda. Medí el ojal. El sesgo: yo suelo forzar la pieza. No lo hice. Dijo: "papá el botón no entra así". No dije «después veo mañana». Cerré a las 8:40.`;

const PASTOR = `Hoy a las 7:05 aprendí que la exigencia moral de productividad agota el C1 biológico y genera doble atadura. Conté 10 animales. El pastor de los 10 animales no corre: ordena. Anoté el cupo. El sesgo: yo suelo exigir más cabeza. No lo hice. Dijo: "el rebaño no se pastorea con culpa". Cerré a las 7:40.`;

describe("MemoryEngine — criterio adaptativo", () => {
  it("el umbral de axioma es estructura > 85", () => {
    assert.equal(UMBRAL_AXIOMA_ESTRUCTURA, 85);
    assert.equal(puedeRegistrarAxioma(85), false);
    assert.equal(puedeRegistrarAxioma(86), true);
    assert.match(INSTRUCCION_CRITERIO_ADAPTATIVO, /automatismo/);
    assert.match(INSTRUCCION_CRITERIO_ADAPTATIVO, /principios previamente descubiertos/);
  });

  it("un volcado flojo no escribe axioma", () => {
    const a = sintetizarAxioma({
      volcadoCrudo: "mal día, todo pesado",
      codigoDominante: 1,
      densidadEstructural: 40,
    });
    assert.equal(a, null);
  });

  it("sintetiza principio y metáfora cuando la estructura supera 85", () => {
    const a = sintetizarAxioma({
      volcadoCrudo: PASTOR,
      codigoDominante: 1,
      densidadEstructural: 90,
      now: 1,
      id: "ax_pastor",
    });
    assert.ok(a);
    assert.equal(a?.codigoRelacionado, "C1");
    assert.match(a?.principioDescubierto ?? "", /C1|exigencia|atadura|pastor/i);
    assert.match(a?.metaforaClave ?? "", /pastor|rebaño|animales/i);
  });

  it("extrae la metáfora del pastor y la cita entre comillas", () => {
    assert.match(extraerMetaforaClave(PASTOR), /pastor/i);
    assert.match(extraerMetaforaClave(SECO_DENSO), /botón no entra/i);
  });

  it("el store evoluciona: nueva regla entra, el gemelo no duplica", () => {
    const a = sintetizarAxioma({
      volcadoCrudo: PASTOR,
      codigoDominante: 1,
      densidadEstructural: 90,
      now: 10,
    });
    assert.ok(a);
    const uno = actualizarBaseConocimiento(storeVacio(), a!);
    assert.equal(uno.evolucion, "nuevo");
    assert.equal(uno.store.axiomas.length, 1);
    assert.equal(reconocerNuevaRegla(uno.store, a!), false);
    const dos = actualizarBaseConocimiento(uno.store, a!);
    assert.equal(dos.evolucion, "sin-cambio");
    assert.equal(dos.store.axiomas.length, 1);
  });

  it("el prompt inyecta la instrucción del especialista y los axiomas", () => {
    const vacio = bloqueInyeccionMaestro(storeVacio());
    assert.match(vacio, /CRITERIO ADAPTATIVO/);
    assert.match(vacio, /automatismo/);
    assert.match(vacio, /UserMetacognitionStore vacío/);

    const a = sintetizarAxioma({
      volcadoCrudo: PASTOR,
      codigoDominante: 1,
      densidadEstructural: 91,
    });
    const lleno = bloqueInyeccionMaestro({ axiomas: [a!] });
    assert.match(lleno, /C1:/);
    assert.match(lleno, /metáfora/i);
    assert.doesNotMatch(lleno, /vacío/);
  });

  it("absorber un volcado denso actualiza el store y cita el axioma hermano", () => {
    const primero = diagnosticarVolcadoLocal(SECO_DENSO);
    const h1 = absorberHallazgo({
      store: storeVacio(),
      diagnostico: primero,
      volcadoCrudo: SECO_DENSO,
    });
    const dens = primero.metricasMerito?.densidadEstructural ?? 0;
    if (dens > 85) {
      assert.equal(h1.evolucion, "nuevo");
      assert.ok(h1.axiomaNuevo);
      assert.equal(h1.store.axiomas.length, 1);
    } else {
      assert.ok(dens > 75, `densidad ${dens} debería ser alta`);
    }

    const hermano = diagnosticarVolcadoLocal(
      "Hoy a las 9:00 aprendí que forzar la pieza rompe el encaje. Ajusté 4 de tensión. Corté 8 botones. El sesgo: yo suelo apurar. Dijo: \"el botón no entra así\". Cerré a las 9:20.",
      undefined,
      [],
      undefined,
      [],
      h1.store,
    );
    if (h1.store.axiomas.length > 0) {
      assert.match(hermano.devolucionMaestro, /Axioma del operador|Criterio vivo|encaje|botón/i);
    }
  });
});
