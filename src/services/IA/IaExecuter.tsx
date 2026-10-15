import { getAIRecommendations, obtenerContextoParaIA, obtenerContextoUsuarioParaIA } from "./Iaservice";
import { obtenerImagenesPorDestino } from "../lugaresService";

/**
 * Obtiene las coordenadas geográficas del dispositivo mediante la API del navegador.
 */
const obtenerUbicacionActual = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            return resolve(null);
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 5000, enableHighAccuracy: false }
        );
    });
};

/**
 * Ejecuta el pipeline completo de recomendación turística inteligente basada en afinidad.
 *
 * @param uid Identificador único del usuario autenticado en Firebase.
 * @param cantidad Número máximo de recomendaciones requeridas.
 * @returns {Promise<any[]>} Lista de destinos recomendados con puntuación de afinidad e imágenes resueltas.
 */
export async function ejecutarConsultaIA(uid: string, cantidad: number = 10): Promise<any[]> {
    if (!uid) return [];

    const userContext = await obtenerContextoUsuarioParaIA(uid);
    if (!userContext) return [];

    // Consulta concurrente de coordenadas GPS y catálogo general para reducir latencia
    const [coords, lugaresCatalogo] = await Promise.all([
        obtenerUbicacionActual(),
        obtenerContextoParaIA()
    ]);

    if (!lugaresCatalogo || lugaresCatalogo.length === 0) {
        return [];
    }

    try {
        const respuesta = await getAIRecommendations(lugaresCatalogo, userContext, coords, cantidad);

        if (!respuesta?.recommendations || !Array.isArray(respuesta.recommendations) || respuesta.recommendations.length === 0) {
            return [];
        }

        // Fusión de las inferencias semánticas de la IA con la entidad original del catálogo
        const lugaresMapeados = respuesta.recommendations
            .map((rec: any) => {
                const infoOriginal = lugaresCatalogo.find((p) => p.id === rec.placeId);
                if (!infoOriginal) return null;

                return {
                    ...infoOriginal,
                    Score_IA: rec.score,
                    Motivo: rec.reason
                };
            })
            .filter((lugar: null): lugar is NonNullable<typeof lugar> => lugar !== null);

        // Carga diferida de recursos fotográficos exclusivamente para los destinos clasificados
        const lugaresConFotos = await Promise.all(
            lugaresMapeados.map(async (lugar: { id: string; }) => {
                try {
                    if (!lugar.id) return lugar;
                    const fotos = await obtenerImagenesPorDestino(lugar.id);
                    return {
                        ...lugar,
                        imagenes: fotos && fotos.length > 0 ? fotos : undefined
                    };
                } catch {
                    return lugar;
                }
            })
        );

        return lugaresConFotos;
    } catch {
        return [];
    }
}