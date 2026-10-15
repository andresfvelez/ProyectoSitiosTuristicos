import { obtenerLugares } from "./lugaresService";
import { LugarTuristico } from "../Components/models/LugarTuristico";

export interface ResultadoRNT {
    valido: boolean;
    razonSocial?: string;
    departamento?: string;
    municipio?: string;
    categoria?: string;
    estado?: string;
    mensaje: string;
}

export interface ResultadoUNESCO {
    valido: boolean;
    nombreSitio?: string;
    mensaje: string;
}

/**
 * Calcula la distancia en kilómetros entre dos coordenadas geográficas usando la fórmula de Haversine.
 * @param lat1 Latitud del punto 1
 * @param lon1 Longitud del punto 1
 * @param lat2 Latitud del punto 2
 * @param lon2 Longitud del punto 2
 * @returns {number} Distancia formateada a 2 decimales (Ej: 0.45 km)
 */
export function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Number((R * c).toFixed(2));
}

/**
 * Algoritmo heurístico para la detección de posibles destinos duplicados en el catálogo.
 * Evalúa coincidencias exactas por documentos (RNT, NIT, UNESCO), similitud léxica y cercanía geográfica.
 */
export const buscarPosiblesDuplicados = async (destinoPendiente: LugarTuristico): Promise<{ lugar: LugarTuristico; motivo: string }[]> => {
    try {
        const aprobados = await obtenerLugares();
        const duplicadosEncontrados: { lugar: LugarTuristico; motivo: string }[] = [];

        aprobados.forEach((existente) => {
            // Se ignora la comparación contra sí mismo
            if (existente.id === destinoPendiente.id) return;

            // La heurística solo aplica para la misma categoría comercial
            if (existente.categoria !== destinoPendiente.categoria) return;

            // 1. Evaluación de Registros Oficiales (RNT, NIT, UNESCO)
            if (destinoPendiente.rnt && existente.rnt && destinoPendiente.rnt.trim() === existente.rnt.trim()) {
                duplicadosEncontrados.push({ lugar: existente, motivo: `Mismo RNT: ${existente.rnt}` });
                return;
            }

            if (destinoPendiente.nit && existente.nit && destinoPendiente.nit.trim() === existente.nit.trim()) {
                duplicadosEncontrados.push({ lugar: existente, motivo: `Mismo NIT: ${existente.nit}` });
                return;
            }

            if (destinoPendiente.unescoId && existente.unescoId && destinoPendiente.unescoId.trim() === existente.unescoId.trim()) {
                duplicadosEncontrados.push({ lugar: existente, motivo: `Mismo ID UNESCO: ${existente.unescoId}` });
                return;
            }

            // 2. Coincidencia por similitud léxica (Nombre)
            const nomNuevo = (destinoPendiente.nombre || "").toLowerCase().trim();
            const nomExistente = (existente.nombre || "").toLowerCase().trim();

            const coincideNombre = nomNuevo.length > 3 && (nomExistente.includes(nomNuevo) || nomNuevo.includes(nomExistente));

            // 3. Coincidencia por proximidad espacial (Radio <= 2 Km)
            let esCercano = false;
            let distKm = 0;

            if (destinoPendiente.latitud && destinoPendiente.longitud && existente.latitud && existente.longitud) {
                distKm = calcularDistanciaKm(
                    destinoPendiente.latitud, destinoPendiente.longitud,
                    existente.latitud, existente.longitud
                );
                if (distKm <= 2.0) {
                    esCercano = true;
                }
            }

            // Resolución del motivo de alerta
            if (coincideNombre && esCercano) {
                duplicadosEncontrados.push({ lugar: existente, motivo: `Nombre similar y ubicación a solo ${distKm} km` });
            } else if (coincideNombre) {
                duplicadosEncontrados.push({ lugar: existente, motivo: "Nombre altamente similar o idéntico" });
            } else if (esCercano) {
                duplicadosEncontrados.push({ lugar: existente, motivo: `Ubicación espacial muy cercana (${distKm} km)` });
            }
        });

        return duplicadosEncontrados;
    } catch {
        return [];
    }
};

/**
 * Consulta la vigencia de un Registro Nacional de Turismo ante el Ministerio de Comercio (Datos Abiertos Colombia).
 * @param rnt Consecutivo numérico del registro
 */
export const validarRNTColombia = async (rnt: string): Promise<ResultadoRNT> => {
    if (!rnt || rnt.trim() === "") {
        return { valido: false, mensaje: "RNT no proporcionado" };
    }

    try {
        const cleanRnt = rnt.replace(/\D/g, "");
        if (!cleanRnt) {
            return { valido: false, mensaje: "El RNT debe poseer formato numérico" };
        }

        const res = await fetch(`https://www.datos.gov.co/resource/thwd-ivmp.json?$q=${cleanRnt}`);

        if (!res.ok) {
            return { valido: false, mensaje: "No se pudo establecer conexión con el MinCIT" };
        }

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
            // Búsqueda de coincidencia exacta sobre el campo codigo_rnt
            const registroExacto = data.find(
                (item: any) => String(item.codigo_rnt).trim() === cleanRnt
            );

            if (registroExacto) {
                const estado = registroExacto.estado_rnt || "ACTIVO";
                const esValido = estado.toUpperCase() === "ACTIVO";

                return {
                    valido: esValido,
                    razonSocial: registroExacto.razon_social_establecimiento,
                    departamento: registroExacto.departamento,
                    municipio: registroExacto.municipio,
                    categoria: registroExacto.categoria,
                    estado: estado,
                    mensaje: esValido
                        ? `RNT Válido: ${registroExacto.razon_social_establecimiento} (${registroExacto.municipio}, ${registroExacto.departamento})`
                        : `El RNT se encuentra suspendido o en estado: ${estado}`
                };
            }
        }

        return { valido: false, mensaje: `El RNT #${cleanRnt} no figura en los registros del MinCIT` };
    } catch {
        return { valido: false, mensaje: "Excepción al intentar consultar la base de datos de Datos Abiertos" };
    }
};

/**
 * Valida la existencia de una declaratoria patrimonial mediante la API de Wikidata/UNESCO.
 * @param unescoId Identificador patrimonial (P757)
 */
export const validarUNESCO = async (unescoId: string): Promise<ResultadoUNESCO> => {
    if (!unescoId || unescoId.trim() === "") {
        return { valido: false, mensaje: "Código UNESCO no proporcionado" };
    }

    try {
        const cleanId = unescoId.replace(/\D/g, "");
        if (!cleanId) {
            return { valido: false, mensaje: "El ID debe ser estrictamente numérico (ej: 284)" };
        }

        const url = `https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=haswbstatement:P757=${cleanId}&format=json&origin=*`;
        const res = await fetch(url);

        if (!res.ok) {
            return { valido: false, mensaje: "Error de red al contactar con el servicio de Wikidata" };
        }

        const data = await res.json();
        const resultados = data.query?.search;

        if (resultados && resultados.length > 0) {
            const item = resultados[0];

            // Limpieza de etiquetas HTML en el snippet devuelto por la API
            const nombreLegible = item.snippet
                ? item.snippet.replace(/<[^>]*>/g, '').split('\n')[0].trim()
                : item.title;

            return {
                valido: true,
                nombreSitio: nombreLegible,
                mensaje: `Patrimonio Oficial Reconocido: ${nombreLegible}`
            };
        }

        return { valido: false, mensaje: `El Código UNESCO #${cleanId} no figura en los registros internacionales` };
    } catch {
        return { valido: false, mensaje: "Fallo en la resolución de la consulta contra el registro UNESCO" };
    }
};