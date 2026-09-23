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
import { obtenerVistasDirectoDesdeGA4 } from '../ga4Services';
import {UserProfileData} from "../../Components/models/Usuarios";

let indiceKeyActual = 0;
let listaKeysDesencriptadas: string[] = [];
let peticionEnCurso: Promise<string | null> | null = null; //

// 🤖 Jerarquía de Modelos: Principal primero, respaldos después
const MODELOS_JERARQUIA = [
    "gemini-3.1-flash-lite-preview", // 1º Intento (Principal)
    "gemini-2.5-flash",              // 2º Intento (Respaldo 1)
    "gemini-1.5-flash"               // 3º Intento (Respaldo 2)
];


export const consultarGeminiConRotacion = async (
    prompt: string,
    maxTokens = 4096
): Promise<string | null> => {
    // 🛡️ BLOQUEO ANTI-DUPLICADOS: Si ya hay una consulta ejecutándose, compartimos la misma promesa
    if (peticionEnCurso) {
        console.warn("⚠️ Ya existe una petición a Gemini en curso. Reutilizando la respuesta...");
        return peticionEnCurso;
    }

    // Encapsulamos la ejecución en la promesa global
    peticionEnCurso = (async () => {
        const llaves = await obtenerLlavesGemini();
        if (llaves.length === 0) return null;

        let intentosPorKey = 0;
        const totalLlaves = llaves.length;

        // Nivel 1: Bucle de LLAVES
        while (intentosPorKey < totalLlaves) {
            const apiKeyActiva = llaves[indiceKeyActual];
            let keyAgotada = false;

            // Nivel 2: Bucle de MODELOS
            for (const modelName of MODELOS_JERARQUIA) {
                if (keyAgotada) break;

                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKeyActiva}`;

                // Nivel 3: Bucle de REINTENTOS
                for (let intento = 1; intento <= 3; intento++) {
                    try {
                        const response = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }],
                                generationConfig: { temperature: 0.1, topP: 0.95, maxOutputTokens: maxTokens }
                            })
                        });

                        if (response.status === 404) break;

                        const data = await response.json();

                        // 🛑 429: Cuota diaria agotada
                        if (response.status === 429 || data?.error?.status === "RESOURCE_EXHAUSTED") {
                            console.warn(`🛑 Cuota agotada en Key #${indiceKeyActual + 1} para ${modelName}.`);
                            keyAgotada = true;
                            break;
                        }

                        // ⏳ 503: Servidor ocupado
                        if (response.status === 503) {
                            const pausa = intento * 3000;
                            console.warn(`⏳ [${modelName}] Servidor caído (503). Reintento ${intento}/3 en ${pausa / 1000}s...`);
                            await new Promise(r => setTimeout(r, pausa));
                            continue;
                        }

                        // ✅ ÉXITO
                        if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                            const texto = data.candidates[0].content.parts[0].text;
                            return texto.replace(/```json/g, "").replace(/```/g, "").trim();
                        }

                    } catch (error) {
                        console.error(`Error de red en ${modelName}:`, error);
                        if (intento === 3) break;
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
            }

            if (keyAgotada) {
                indiceKeyActual = (indiceKeyActual + 1) % totalLlaves;
                intentosPorKey++;
                console.log(`🔄 Rotando a la API Key de respaldo #${indiceKeyActual + 1}...`);
            } else {
                break;
            }
        }

        console.error("❌ Todos los modelos y llaves fallaron. Google IA no está disponible.");
        return null;
    })();

    try {
        return await peticionEnCurso;
    } finally {
        // 🔓 Liberamos el candado al finalizar la respuesta (exitosa o fallida)
        peticionEnCurso = null;
    }
};
export const obtenerLlavesGemini = async (): Promise<string[]> => {
    if (listaKeysDesencriptadas.length > 0) return listaKeysDesencriptadas;

    try {
        const docRef = doc(db, "Constantes", "claves");
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) throw new Error("No existe configuración de llaves.");

        const data = docSnap.data();
        const fraseMaestra = data.encriptado;
        const llavesEncriptadas: string[] = data.geminiKeys || [GEMINI_API_KEY];

        listaKeysDesencriptadas = llavesEncriptadas.map((keyEnc) => {
            const bytes = CryptoJS.AES.decrypt(keyEnc, fraseMaestra);
            return bytes.toString(CryptoJS.enc.Utf8).trim();
        }).filter(k => k.length > 0);

        return listaKeysDesencriptadas;
    } catch (error) {
        console.error("Error recuperando las llaves:", error);
        return [];
    }
};




// 🤖 OBTENER CONTEXTO GENERAL (Firestore + Opiniones + Vistas GA4)
export const obtenerContextoParaIA = async (): Promise<LugarTuristico[]> => {
    try {
        const [snapshotLugares, snapshotOpiniones, vistasGA4] = await Promise.all([
            getDocs(query(collection(db, 'lugares_turisticos_scrapped'),
                where('confirmado', '==', true),
                where('categoria', 'not-in', ['hotel', 'aventura']))),
            getDocs(collection(db, 'opiniones_lugares')),
            obtenerVistasDirectoDesdeGA4()
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
                vistas: vistasGA4[lugarId] + opiniones.length || 0
            } as LugarTuristico;
        });
    } catch (error) {
        console.error("Error obteniendo contexto para la IA:", error);
        return [];
    }
};

// 🎯 OBTENER RECOMENDACIONES DE LA IA
export async function getAIRecommendations(
    rawPlacesFromDB: any[],
    userContext: UserContext,
    currentCoords: { lat: number, lng: number } | null = null,
    maxResults: number = 20
) {
    if (!userContext || !userContext.userId) {
        console.error("⚠️ Se requiere un usuario autenticado para consultar la IA.");
        return { recommendations: [] };
    }

    if (currentCoords) {
        userContext.currentLocation = currentCoords;
    }

    const places = rawPlacesFromDB.map(mapFirestorePlaceToAI);
    const topCandidatos = places
        .sort((a, b) => b.rating - a.rating);
    const payload = buildAIPayload(userContext, topCandidatos, maxResults);
    const prompt = buildAIPromptRTCF(payload);
    try {
        const resultText = await consultarGeminiConRotacion(prompt, 4096);

        if (!resultText) {
            throw new Error("No se obtuvo respuesta válida de Gemini.");
        }

        return JSON.parse(resultText);
    } catch (error) {
        console.error("Error obteniendo recomendaciones de Gemini:", error);
        return { recommendations: [] };
    }
}

// 👤 Obtener perfil completo del usuario
export const obtenerPerfilUsuario = async (uid: string): Promise<UserProfileData | null> => {
    const userDocRef = doc(db, "usuarios", uid);
    const userSnap = await getDoc(userDocRef);
    return userSnap.exists() ? (userSnap.data() as UserProfileData) : null;
};


export const obtenerContextoUsuarioParaIA = async (uid: string): Promise<UserContext | null> => {
    if (!uid) return null;

    console.log(`👤 Obteniendo perfil de Firestore para armar contexto IA (UID: ${uid})...`);
    const dataUsuario = await obtenerPerfilUsuario(uid);

    if (!dataUsuario) {
        console.warn(`⚠️ No se encontró información en Firestore para el usuario ${uid}`);
        return null;
    }

    // 3. Mapeo seguro: Si el usuario tiene el perfil incompleto, usamos fallbacks lógicos
    const userContext: UserContext = {
        userId: uid,
        preferences: {
            clima: dataUsuario.clima || 'templado',
            entorno: dataUsuario.entorno || 'naturaleza',
            rangoPresupuesto: dataUsuario.rangoPresupuesto || 'economico',
            tipoAcceso: dataUsuario.tipoAcceso || 'carro',
            ritmo: dataUsuario.ritmo || 'moderado',
            companiaIdeal: (dataUsuario.companiaIdeal && dataUsuario.companiaIdeal.length > 0)
                ? dataUsuario.companiaIdeal
                : ['pareja', 'amigos'] // Fallback por si no lo ha llenado
        },
        // Opcionales vacíos por defecto (tal cual lo acordamos)
        lastVisitedPlaces: [],
        avoidedEnvironments: []
    };

    return userContext;
};


export const exportarLugaresSinOpinionesAJSON = async () => {
    try {
        // 1. Consultar colecciones de Firestore en paralelo
        const [snapLugares, snapOpiniones] = await Promise.all([
            getDocs(collection(db, 'lugares_turisticos_scrapped')),
            getDocs(collection(db, 'opiniones_lugares'))
        ]);

        // 2. Registrar en un Set los IDs de lugares que SÍ tienen opiniones
        const idsConOpiniones = new Set<string>();
        snapOpiniones.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.lugarId) {
                idsConOpiniones.add(data.lugarId);
            }
        });

        // 3. Filtrar ÚNICAMENTE los lugares que NO existen en el Set de opiniones
        const lugaresSinOpiniones = snapLugares.docs
            .filter((docSnap) => !idsConOpiniones.has(docSnap.id))
            .map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    nombre: data.nombre || 'Sin nombre',
                    descripcion: data.descripcion || ''
                };
            });

        // 4. Estructurar el resultado final
        const resultadoJSON = {
            fechaExportacion: new Date().toISOString(),
            totalLugaresSinOpiniones: lugaresSinOpiniones.length,
            lugares: lugaresSinOpiniones
        };

        // 5. Descargar automáticamente el archivo JSON
        const jsonString = JSON.stringify(resultadoJSON, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `lugares_sin_opiniones_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return resultadoJSON;
    } catch (error) {
        console.error("Error al exportar lugares sin opiniones:", error);
        return null;
    }
};

