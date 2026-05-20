import {getAIRecommendations} from "./Iaservice";
import {UserContext} from "../../Components/models/IaPayload";

export async function ejecutarConsultaIA(rawPlaces: any[], userContext: UserContext | null = null) {
    const obtenerUbicacion = (): Promise<{ lat: number, lng: number } | null> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) resolve(null);
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve(null),
                { timeout: 5000 }
            );
        });
    };

    console.log("🔍 Iniciando proceso de recomendación...");
    const coords = await obtenerUbicacion();

    try {
        const respuesta = await getAIRecommendations(rawPlaces, userContext, coords);

        // Validamos que respuesta NO sea null y que tenga recomendaciones
        if (respuesta && respuesta.recommendations && respuesta.recommendations.length > 0) {
            console.log("✅ IA ha respondido con éxito.");

            const lugaresReconocidos = respuesta.recommendations.map((rec: any) => {
                const infoOriginal = rawPlaces.find(p => p.id === rec.placeId);
                return {
                    Nombre: infoOriginal?.nombre || "No encontrado",
                    Ciudad: infoOriginal?.ciudad || "N/A",
                    // Mostramos la puntuación que tiene en Firebase
                    Puntuacion_DB: infoOriginal?.puntuacion || 0,
                    // Mostramos el "Score" que le puso la IA (basado en cercanía/joya oculta)
                    Relevancia_IA: rec.score,
                    Motivo: rec.reason
                };
            });

            console.log("--- RESULTADOS VALIDADOS POR IA ---");
            console.table(lugaresReconocidos);
            return lugaresReconocidos;
        } else {
            // Si entra aquí es porque falló o devolvió lista vacía
            console.warn("⚠️ No se pudieron obtener recomendaciones válidas de la IA.");
        }
    } catch (error) {
        console.error("❌ Error al llamar a la IA:", error);
    }
}