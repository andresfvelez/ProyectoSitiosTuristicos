import { buildAIPayload } from './ia-payload.builder';
import { mapFirestorePlaceToAI } from './mapper';
import { UserContext, TouristPlace } from '../../Components/models/IaPayload';

import {GEMINI_API_KEY} from "../../env";
import {doc, getDoc} from "firebase/firestore";
import {db} from "../../firebase/firebaseConfig";
import CryptoJS from "crypto-js";
import {buildAIPromptRTCF} from "./ia-prompt-rtccf-meth";

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

export async function getAIRecommendations(
    rawPlacesFromDB: any[],
    userContext: UserContext | null = null, // Viene null si no está logueado
    currentCoords: { lat: number, lng: number } | null = null,
    maxResults: number = 5
) {
    // 1. Creamos un contexto base por si es invitado
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


    // 2. Inyectamos la localización actual si se detectó por GPS
    if (currentCoords) {
        finalContext.currentLocation = currentCoords;
    }

    // 3. Mapeamos los sitios de la DB
    const places = rawPlacesFromDB.map(mapFirestorePlaceToAI);

    // 4. Construimos el Payload con pesos
    // Nota: Si es invitado, damos más peso a la distancia y a la valoración (novelty)
    const payload = buildAIPayload(finalContext, places, maxResults);

    if (!userContext) {
        payload.weightingCriteria = {
            environmentMatch: 0.10,
            activityMatch: 0.10,
            distance: 0.20,
            popularity: 0.20,
            novelty: 0.40   // Mucho peso a que sea un sitio de calidad
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
                // 🔥 ESTO ES LO QUE BUSCAS:
                generationConfig: {
                    temperature: 0.1, // Reduce el azar al mínimo
                    topP: 0.95,
                    maxOutputTokens: 1024, // Limita la respuesta para que sea más rápida
                }
            })
        });

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("La IA no devolvió resultados");
        }

        let resultText = data.candidates[0].content.parts[0].text;

        // Limpieza de caracteres extra que a veces pone Gemini
        resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(resultText);
    } catch (error) {
        console.error("Error obteniendo recomendaciones:", error);
        return { recommendations: [] };
    }
}