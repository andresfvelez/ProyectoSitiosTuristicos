import { buildAIPayload } from './ia-payload.builder';
import { mapFirestorePlaceToAI } from './mapper';
import { UserContext } from '../../Components/models/IaPayload';
import { GEMINI_API_KEY } from "../../env";
import CryptoJS from "crypto-js";
import { buildAIPromptRTCF } from "./ia-prompt-rtccf-meth";
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { LugarTuristico, Opinion } from '../../Components/models/LugarTuristico';
import { obtenerVistasDirectoDesdeGA4 } from '../ga4Services'; // 👈 Importación del servicio de GA4

const obtenerLlaveReal = async () => {
    try {
        const docRef = doc(db, "Constantes", "claves");
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) throw new Error("No existe la frase en Firebase");

        const fraseMaestra = docSnap.data().encriptado;
        const bytes = CryptoJS.AES.decrypt(GEMINI_API_KEY, fraseMaestra);
        const originalKey = bytes.toString(CryptoJS.enc.Utf8);

        return originalKey;
    } catch (error) {
        console.error("Error desencriptando:", error);
        return null;
    }
};

const GUEST_CONTEXT: UserContext = {
    userId: 'guest',
    preferences: {
        categorias: [],
        acompañantes: [],
        presupuesto: 'Medio',
        clima: 'Templado',
        preferenciaDestino: 'Destinos poco conocidos',
        duracionEstancia: 'Fin de semana',
        nivelEsfuerzo: 'Moderado',
        entorno: 'Rural',
        tipoAcceso: 'Vehículo simple'
    },
    lastVisitedPlaces: [],
    avoidedEnvironments: []
};

// 🤖 OBTENER CONTEXTO PARA IA (Consultando Firestore + GA4)
export const obtenerContextoParaIA = async (): Promise<LugarTuristico[]> => {
    try {
        // 🚀 Consultamos Firestore y Google Analytics en paralelo (1 sola petición HTTP a GA4)
        const [snapshotLugares, snapshotOpiniones, vistasGA4] = await Promise.all([
            getDocs(query(collection(db, 'lugares_turisticos_scrapped'), where('confirmado', '==', true))),
            getDocs(collection(db, 'opiniones_lugares')),
            obtenerVistasDirectoDesdeGA4() // 👈 Invocación a las métricas reales
        ]);

        const opinionesPorLugar: Record<string, Opinion[]> = {};

        snapshotOpiniones.docs.forEach(docSnap => {
            const data = docSnap.data() as Opinion;
            if (!opinionesPorLugar[data.lugarId]) {
                opinionesPorLugar[data.lugarId] = [];
            }
            opinionesPorLugar[data.lugarId].push(data);
        });

        return snapshotLugares.docs.map(docSnap => {
            const data = docSnap.data();
            const lugarId = docSnap.id;
            const opiniones = opinionesPorLugar[lugarId] || [];

            let puntuacionCalculada = data.puntuacion || 0;
            if (opiniones.length > 0) {
                const suma = opiniones.reduce((acc, op) => acc + (op.puntuacion || 0), 0);
                puntuacionCalculada = Number((suma / opiniones.length).toFixed(1));
            }

            return {
                id: lugarId,
                ...data,
                opiniones,
                puntuacion: puntuacionCalculada,
                // 📊 Inyectamos las vistas extraídas directamente de Google Analytics
                vistas: vistasGA4[lugarId] || 0
            } as LugarTuristico;
        });
    } catch (error) {
        console.error("Error obteniendo contexto para la IA:", error);
        return [];
    }
};

export async function getAIRecommendations(
    rawPlacesFromDB: any[],
    userContext: UserContext | null = null,
    currentCoords: { lat: number, lng: number } | null = null,
    maxResults: number = 5
) {
    const finalContext: UserContext = userContext || {
        userId: "invitado_" + Math.random().toString(36).substring(7),
        preferences: {
            categorias: [],
            acompañantes: [],
            presupuesto: 'Medio',
            clima: 'Templado',
            preferenciaDestino: 'Destinos poco conocidos',
            duracionEstancia: 'Fin de semana',
            nivelEsfuerzo: 'Moderado',
            entorno: 'Rural',
            tipoAcceso: 'Vehículo simple'
        },
        lastVisitedPlaces: [],
        avoidedEnvironments: []
    };

    if (currentCoords) {
        finalContext.currentLocation = currentCoords;
    }

    const places = rawPlacesFromDB.map(mapFirestorePlaceToAI);
    const payload = buildAIPayload(finalContext, places, maxResults);

    if (!userContext) {
        payload.weightingCriteria = {
            environmentMatch: 0.10,
            activityMatch: 0.10,
            distance: 0.20,
            popularity: 0.20,
            novelty: 0.40
        };
    }

    const prompt = buildAIPromptRTCF(payload);

    try {
        const rawKey = await obtenerLlaveReal();
        if (!rawKey) throw new Error("No se pudo obtener la API Key");

        const apiKey = rawKey.trim();
        const modelName = "gemini-3.1-flash-lite-preview";
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("La IA no devolvió resultados");
        }

        let resultText = data.candidates[0].content.parts[0].text;
        resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(resultText);
    } catch (error) {
        console.error("Error obteniendo recomendaciones:", error);
        return { recommendations: [] };
    }
}