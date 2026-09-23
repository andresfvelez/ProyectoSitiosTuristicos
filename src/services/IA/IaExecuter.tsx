import { getAIRecommendations, obtenerContextoParaIA, obtenerContextoUsuarioParaIA } from "./Iaservice";
import {obtenerImagenesPorDestino} from "../lugaresService";

/**
 * Ejecuta el pipeline completo de recomendación inteligente.
 * @param uid Identificador único del usuario autenticado en Firebase.
 */
export async function ejecutarConsultaIA(uid: string,cantidad:number) {
    // 📍 Helper para obtener la geolocalización actual
    const obtenerUbicacion = (): Promise<{ lat: number, lng: number } | null> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve(null),
                { timeout: 5000 }
            );
        });
    };

    // 🛡️ 1. Validación de Entrada
    if (!uid) {
        console.warn("⚠️ No se proporcionó un UID de usuario válido.");
        return [];
    }

    const userContext = await obtenerContextoUsuarioParaIA(uid);

    if (!userContext) {
        console.warn("⚠️ No se pudo obtener el contexto del usuario desde Firestore.");
        return [];
    }

    const coords = await obtenerUbicacion();

    const lugaresCatalogo = await obtenerContextoParaIA();

    console.log(lugaresCatalogo)
    if (!lugaresCatalogo || lugaresCatalogo.length === 0) {
        console.warn("⚠️ No existen lugares confirmados disponibles en la BD para analizar.");
        return [];
    }


    try {
        const respuesta = await getAIRecommendations(lugaresCatalogo, userContext, coords,cantidad);

        if (respuesta && respuesta.recommendations && respuesta.recommendations.length > 0) {
            console.log("✅ IA respondió con éxito.");

            // 5. Cruzar resultados de la IA con los datos del catálogo
            const lugaresMapeados = respuesta.recommendations
                .map((rec: any) => {
                    const infoOriginal = lugaresCatalogo.find(p => p.id === rec.placeId);
                    if (!infoOriginal) return null;

                    return {
                        ...infoOriginal,
                        Score_IA: rec.score,
                        Motivo: rec.reason
                    };
                })
                .filter((lugar: any): lugar is NonNullable<typeof lugar> => lugar !== null);

            console.log(lugaresMapeados)
            // 🖼️ 6. CARGAMOS LAS FOTOS REALES SOLO PARA ESTOS 20 LUGARES RECOMENDADOS
            const lugaresConFotos = await Promise.all(
                lugaresMapeados.map(async (lugar: any) => {
                    try {
                        const fotos = await obtenerImagenesPorDestino(lugar.id);
                        return {
                            ...lugar,
                            imagenes: fotos && fotos.length > 0 ? fotos : undefined
                        };
                    } catch (error) {
                        return lugar;
                    }
                })
            );

            return lugaresConFotos;
        } else {
            console.warn("⚠️ La IA no encontró destinos que superen el umbral de afinidad para este perfil.");
            return [];
        }
    } catch (error) {
        console.error("❌ Error en la ejecución de la recomendación IA:", error);
        return [];
    }
}