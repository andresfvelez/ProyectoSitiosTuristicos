
import {obtenerLugares} from "./lugaresService";
import {LugarTuristico} from "../Components/models/LugarTuristico";

export function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2)); // Retorna distancia formateada a 2 decimales (Ej: 0.45 km)
}
// ALGORITMO DE DETECCIÓN DE POSIBLES DUPLICADOS
export const buscarPosiblesDuplicados = async (destinoPendiente: LugarTuristico): Promise<{ lugar: LugarTuristico; motivo: string }[]> => {
    try {
        const aprobados = await obtenerLugares(); // Obtenemos la base de datos confirmada
        const duplicadosEncontrados: { lugar: LugarTuristico; motivo: string }[] = [];

        aprobados.forEach((existente) => {
            // Ignorar el mismo documento si por alguna razón está comparándose consigo mismo
            if (existente.id === destinoPendiente.id) return;

            // misma categoría
            if (existente.categoria !== destinoPendiente.categoria) return;

            // Registros Oficiales (RNT, NIT, UNESCO)
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

            // Coincidencia por Nombre Similar
            const nomNuevo = (destinoPendiente.nombre || "").toLowerCase().trim();
            const nomExistente = (existente.nombre || "").toLowerCase().trim();

            const coincideNombre = nomNuevo.length > 3 && (nomExistente.includes(nomNuevo) || nomNuevo.includes(nomExistente));

            // Coincidencia por Cercanía Geográfica (Radio <= 2 Km)
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

            // Determinar motivo de alerta
            if (coincideNombre && esCercano) {
                duplicadosEncontrados.push({ lugar: existente, motivo: `Nombre similar y a solo ${distKm} km` });
            } else if (coincideNombre) {
                duplicadosEncontrados.push({ lugar: existente, motivo: "Nombre muy similar o idéntico" });
            } else if (esCercano) {
                duplicadosEncontrados.push({ lugar: existente, motivo: `Ubicación muy cercana (${distKm} km)` });
            }
        });

        return duplicadosEncontrados;

    } catch (error) {
        console.error("Error al verificar duplicados:", error);
        return [];
    }
};
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
 * Validar RNT en Datos Abiertos Colombia (MinCIT)
 */
export const validarRNTColombia = async (rnt: string): Promise<ResultadoRNT> => {
    if (!rnt || rnt.trim() === "") {
        return { valido: false, mensaje: "RNT no proporcionado" };
    }

    try {
        const cleanRnt = rnt.replace(/\D/g, "");
        if (!cleanRnt) {
            return { valido: false, mensaje: "El RNT debe ser numérico" };
        }

        // Consulta con $q para compatibilidad universal
        const res = await fetch(`https://www.datos.gov.co/resource/thwd-ivmp.json?$q=${cleanRnt}`);
        if (!res.ok) throw new Error("Error en servidor de Datos Abiertos");

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
            // 🎯 FILTRO DE PRECISIÓN: Busca únicamente el registro cuyo codigo_rnt coincida exactamente
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
                        ? `RNT Valido: ${registroExacto.razon_social_establecimiento}, Localizacion: ${registroExacto.municipio},${registroExacto.departamento} `
                        : `El RNT se encuentra en estado: ${estado}`
                };
            }
        }

        return { valido: false, mensaje: `RNT #${cleanRnt} no encontrado en MinCIT` };
    } catch (error) {
        console.error("Error validando RNT:", error);
        return { valido: false, mensaje: "No se pudo conectar con MinCIT" };
    }
};

/**
 * Validar ID UNESCO en el Registro Mundial (Wikidata / UNESCO)
 */
export const validarUNESCO = async (unescoId: string): Promise<ResultadoUNESCO> => {
    if (!unescoId || unescoId.trim() === "") {
        return { valido: false, mensaje: "Código UNESCO no proporcionado" };
    }

    try {
        const cleanId = unescoId.replace(/\D/g, "");
        if (!cleanId) {
            return { valido: false, mensaje: "El ID debe ser numérico (ej: 284)" };
        }

        // API REST oficial de Wikidata para la propiedad P757
        const url = `https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=haswbstatement:P757=${cleanId}&format=json&origin=*`;
        const res = await fetch(url);

        if (!res.ok) throw new Error("Error en la solicitud a Wikidata");

        const data = await res.json();
        const resultados = data.query?.search;

        if (resultados && resultados.length > 0) {
            const item = resultados[0];

            // Limpia las etiquetas HTML (<span class="searchmatch">) del snippet para obtener el nombre legible
            let nombreLegible = item.snippet
                ? item.snippet.replace(/<[^>]*>/g, '').split('\n')[0].trim()
                : item.title;

            return {
                valido: true,
                nombreSitio: nombreLegible,
                mensaje: `Patrimonio Oficial: ${nombreLegible}`
            };
        }

        return { valido: false, mensaje: `Código UNESCO #${cleanId} no registrado` };
    } catch (error) {
        console.error("Error validando UNESCO:", error);
        return { valido: false, mensaje: "No se pudo consultar el registro UNESCO" };
    }
};