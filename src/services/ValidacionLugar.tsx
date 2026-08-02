
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