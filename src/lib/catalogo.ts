// Recorrido del catálogo de vacantes por lotes, para que la página de
// recomendaciones no dependa de que el catálogo quepa en memoria.
//
// POR QUÉ EXISTE ESTE ARCHIVO
//
// `/recomendaciones` traía el catálogo completo en cada visita y lo puntuaba
// entero. Con las decenas de vacantes de hoy eso es gratis; con las decenas de
// miles de un catálogo profesional, el problema no es la aritmética del motor
// sino traer todas las filas a memoria y renderizarlas.
//
// POR QUÉ NO SE FILTRA POR PREFERENCIAS ANTES DE PUNTUAR
//
// La salida natural sería descartar en SQL las vacantes que no coinciden con la
// ciudad o la modalidad que el candidato prefiere, y puntuar solo el resto. Ese
// atajo da resultados incorrectos: en el Match Score la ubicación pesa 5% y la
// modalidad 10%, así que una vacante en otra ciudad con las habilidades y el
// rol exactos puntúa más alto que una vacante local que no tiene nada que ver.
// Descartarla antes de puntuarla la haría desaparecer de la lista.
//
// Por eso lo único que se empuja a la base de datos son los filtros que el
// propio candidato pidió —si él excluyó una modalidad, excluirla es correcto— y
// el recorrido se hace sobre todo el catálogo restante.
//
// QUÉ SÍ SE ACOTA
//
// El recorrido es por lotes con cursor, de modo que nunca hay más de un lote en
// memoria, y se conservan solo las mejores `limite` recomendaciones. Se evalúan
// todas las vacantes; lo que se acota es cuántas se retienen y cuántas viajan a
// la vez. Con un catálogo chico el resultado es idéntico al de puntuar todo de
// una vez, y eso está cubierto por pruebas.
import { buildRecommendations, type Recomendacion, type VacanteInput } from "./recommender";
import { PESOS_DEFAULT, type Pesos, type PerfilScoring } from "./scoring";

/** Cuántas vacantes se traen por viaje a la base de datos. */
export const TAMANO_LOTE = 500;

/**
 * Cuántas recomendaciones se conservan. Nadie recorre miles de resultados: lo
 * que importa es que las mejores estén arriba, y para eso hay que haber
 * evaluado todo el catálogo, que es lo que hace este recorrido.
 */
export const MAXIMO_RECOMENDACIONES = 100;

/** Trae un lote del catálogo. `desde` es el id de la última vacante del lote anterior. */
export type CargadorDeLote<V extends VacanteInput> = (
  desde: string | null,
  tamano: number
) => Promise<V[]>;

export interface OpcionesRecorrido<V extends VacanteInput> {
  perfil: PerfilScoring;
  cargarLote: CargadorDeLote<V>;
  /**
   * Filtro que no se puede expresar en SQL sin cambiar su significado: la
   * búsqueda por texto y por ciudad ignora tildes y mayúsculas, y traducir eso
   * a SQL exigiría una extensión del motor. Se aplica sobre el lote ya traído.
   */
  filtrarLote?: (vacantes: V[]) => V[];
  pesos?: Pesos;
  ahora?: Date;
  limite?: number;
  tamanoLote?: number;
}

export interface ResultadoRecorrido<V extends VacanteInput> {
  /** Las mejores, ordenadas de mayor a menor puntaje. */
  recomendaciones: Recomendacion<V>[];
  /** Cuántas vacantes pasaron los filtros y fueron puntuadas. */
  evaluadas: number;
  /** Cuántos viajes a la base de datos hizo el recorrido. */
  lotes: number;
  /** Si hubo más coincidencias que las que se devuelven. */
  truncado: boolean;
}

/**
 * Recorre el catálogo por lotes, puntúa cada lote y conserva las mejores.
 *
 * El orden final coincide con el de puntuar el catálogo entero de una vez:
 * `buildRecommendations` ordena de forma estable, los lotes llegan en el orden
 * del catálogo y el desempate final respeta ese mismo orden. La prueba
 * "coincide con puntuar todo de una vez" lo verifica sobre datos con empates.
 */
export async function recorrerCatalogo<V extends VacanteInput>({
  perfil,
  cargarLote,
  filtrarLote,
  pesos = PESOS_DEFAULT,
  ahora = new Date(),
  limite = MAXIMO_RECOMENDACIONES,
  tamanoLote = TAMANO_LOTE,
}: OpcionesRecorrido<V>): Promise<ResultadoRecorrido<V>> {
  if (tamanoLote < 1) throw new Error("El tamaño de lote debe ser al menos 1");
  if (limite < 0) throw new Error("El límite no puede ser negativo");

  // `mejores` se mantiene siempre ordenado y recortado a `limite`, así que su
  // tamaño no depende del catálogo. Se guarda la posición de cada vacante en el
  // catálogo para que los empates se resuelvan igual que en el orden original.
  let mejores: { rec: Recomendacion<V>; posicion: number }[] = [];
  let desde: string | null = null;
  let evaluadas = 0;
  let lotes = 0;
  let posicion = 0;

  for (;;) {
    // Se pide un registro de más que el tamaño del lote. Ese sobrante no se
    // procesa: solo sirve para saber si queda catálogo. Sin él, un catálogo que
    // sea múltiplo exacto del lote obliga a un viaje final vacío a la base de
    // datos en cada visita a la página.
    const traidos: V[] = await cargarLote(desde, tamanoLote + 1);
    if (traidos.length === 0) break;

    const hayMas = traidos.length > tamanoLote;
    const lote = hayMas ? traidos.slice(0, tamanoLote) : traidos;

    lotes += 1;
    desde = lote[lote.length - 1]!.id;

    const candidatas = filtrarLote ? filtrarLote(lote) : lote;
    // La posición se cuenta sobre el lote completo y no sobre el filtrado, para
    // que refleje el lugar real en el catálogo.
    const posiciones = new Map<string, number>();
    for (const v of lote) posiciones.set(v.id, posicion++);

    if (candidatas.length > 0) {
      evaluadas += candidatas.length;
      const puntuadas = buildRecommendations(perfil, candidatas, ahora, pesos).map((rec) => ({
        rec,
        posicion: posiciones.get(rec.vacante.id) ?? Number.MAX_SAFE_INTEGER,
      }));
      mejores = recortar(mejores.concat(puntuadas), limite);
    }

    if (!hayMas) break;
  }

  return {
    recomendaciones: mejores.map((m) => m.rec),
    evaluadas,
    lotes,
    truncado: evaluadas > mejores.length,
  };
}

/**
 * Ordena por puntaje descendente y, ante empate, por la posición original en el
 * catálogo. Sin el desempate por posición el orden dependería de en qué lote
 * cayó cada vacante, y dos visitas seguidas podrían mostrar listas distintas.
 */
function recortar<V extends VacanteInput>(
  items: { rec: Recomendacion<V>; posicion: number }[],
  limite: number
): { rec: Recomendacion<V>; posicion: number }[] {
  items.sort((a, b) => b.rec.score - a.rec.score || a.posicion - b.posicion);
  return items.length > limite ? items.slice(0, limite) : items;
}
