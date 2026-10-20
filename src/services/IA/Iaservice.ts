import {buildAIPayload} from './ia-payload.builder';
import {mapFirestorePlaceToAI} from './mapper';
import {UserContext} from '../../Components/models/IaPayload';
import CryptoJS from "crypto-js";
import { db } from '../../firebase/firebaseConfig';
import { LugarTuristico, Opinion } from '../../Components/models/LugarTuristico';
import { obtenerVistasDirectoDesdeGA4 } from '../ga4Services';
import { UserProfileData } from "../../Components/models/Usuarios";
import {LugarTuristico, Opinion} from '../../Components/models/LugarTuristico';
import {obtenerVistasDirectoDesdeGA4} from '../ga4Services';
import {UserProfileData} from "../../Components/models/Usuarios";
import {obtenerFavoritosPorUsuario} from '../lugaresService';

let indiceKeyActual = 0;
let listaKeysDesencriptadas: string[] = [];
let peticionEnCurso: Promise<string | null> | null = null;

// Jerarquía de modelos para conmutación por fallos (Fallback Hierarchy)
const MODELOS_JERARQUIA = [
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash",
    "gemini-1.5-flash"
];

 */
export const obtenerLlavesGemini = async (): Promise<string[]> => {
    if (listaKeysDesencriptadas.length > 0) return listaKeysDesencriptadas;

    try {
        const docRef = doc(db, "Constantes", "claves");
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return [];

        const data = docSnap.data();
        const fraseMaestra = data.encriptado;
        const llavesEncriptadas: string[] = data.geminiKeys || [];

        listaKeysDesencriptadas = llavesEncriptadas.map((keyEnc) => {
            const bytes = CryptoJS.AES.decrypt(keyEnc, fraseMaestra);
            return bytes.toString(CryptoJS.enc.Utf8).trim();
        }).filter(k => k.length > 0);

        return listaKeysDesencriptadas;
    } catch {
        return [];
    }
};

export const consultarGeminiConRotacion = async (
    prompt: string,
    maxTokens = 4096
): Promise<string | null> => {
    if (peticionEnCurso) {
        return peticionEnCurso;
    }

    peticionEnCurso = (async () => {
        const llaves = await obtenerLlavesGemini();
        if (llaves.length === 0) return null;

        let intentosPorKey = 0;
        const totalLlaves = llaves.length;

        while (intentosPorKey < totalLlaves) {
            const apiKeyActiva = llaves[indiceKeyActual];
            let keyAgotada = false;

            for (const modelName of MODELOS_JERARQUIA) {
                if (keyAgotada) break;

                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKeyActiva}`;

                for (let intento = 1; intento <= 3; intento++) {
                    try {
                        const response = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }],
                                generationConfig: {
                                    temperature: 0.1,
                                    topP: 0.95,
                                    maxOutputTokens: maxTokens
                                }
                            })
                        });

                        if (response.status === 404) break;

                        const data = await response.json();

                        if (response.status === 429 || data?.error?.status === "RESOURCE_EXHAUSTED") {
                            keyAgotada = true;
                            break;
                        }

                        if (response.status === 503) {
                            const pausa = intento * 3000;
                            await new Promise(r => setTimeout(r, pausa));
                            continue;
                        }

                        if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                            const texto = data.candidates[0].content.parts[0].text;
                            return texto.replace(/```json/g, "").replace(/```/g, "").trim();
                        }

                    } catch {
                        if (intento === 3) break;
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
            }

            if (keyAgotada) {
                indiceKeyActual = (indiceKeyActual + 1) % totalLlaves;
                intentosPorKey++;
            } else {
                break;
            }
        }

        return null;
    })();

    try {
        return await peticionEnCurso;
    } finally {
        peticionEnCurso = null;
    }
};

export const obtenerContextoParaIA = async (): Promise<LugarTuristico[]> => {
    try {
        const [snapshotLugares, snapshotOpiniones, vistasGA4] = await Promise.all([
            getDocs(query(
                collection(db, 'lugares_turisticos_scrapped'),
                where('confirmado', '==', true),
                where('categoria', 'not-in', ['hotel', 'restaurante'])
            )),
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
                vistas: (vistasGA4[lugarId] || 0) + opiniones.length
            } as LugarTuristico;
        });
    } catch {
        return [];
    }
};

export const obtenerPerfilUsuario = async (uid: string): Promise<UserProfileData | null> => {
    try {
        const userDocRef = doc(db, "usuarios", uid);
        const userSnap = await getDoc(userDocRef);
        return userSnap.exists() ? (userSnap.data() as UserProfileData) : null;
    } catch {
        return null;
    }
};

export const obtenerContextoUsuarioParaIA = async (uid: string): Promise<UserContext | null> => {
    if (!uid) return null;

    const [dataUsuario, favoritosUsuario] = await Promise.all([
        obtenerPerfilUsuario(uid),
        obtenerFavoritosPorUsuario(uid)
    ]);

    if (!dataUsuario) return null;

    const nombresFavoritos = (favoritosUsuario || [])
        .map((lugar) => lugar.nombre)
        .filter((nombre): nombre is string => Boolean(nombre));

    return {
        userId: uid,
        preferences: {
            clima: dataUsuario.clima || 'templado',
            entorno: dataUsuario.entorno || 'naturaleza',
            rangoPresupuesto: dataUsuario.rangoPresupuesto || 'economico',
            tipoAcceso: dataUsuario.tipoAcceso || 'carro',
            ritmo: dataUsuario.ritmo || 'moderado',
            companiaIdeal: (dataUsuario.companiaIdeal && dataUsuario.companiaIdeal.length > 0)
                ? dataUsuario.companiaIdeal
                : ['pareja', 'amigos']
        },
        lastVisitedPlaces: nombresFavoritos,
        favoritePlaces: nombresFavoritos,
        avoidedEnvironments: []
    } as UserContext;
};

export async function getAIRecommendations(
    rawPlacesFromDB: any[],
    userContext: UserContext,
    currentCoords: { lat: number, lng: number } | null = null,
    maxResults: number = 10
) {
    if (!userContext || !userContext.userId) {
        return { recommendations: [] };
    }

    if (currentCoords) {
        userContext.currentLocation = currentCoords;
    }

    const places = rawPlacesFromDB.map(mapFirestorePlaceToAI);
    const topCandidatos = places.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    const payload = buildAIPayload(userContext, topCandidatos, maxResults);
    const prompt = buildAIPromptRTCF(payload);

    try {
        const resultText = await consultarGeminiConRotacion(prompt, 4096);
        if (!resultText) {
            return { recommendations: [] };
        }

        return JSON.parse(resultText);
    } catch {
        return { recommendations: [] };
    }
}

export const exportarLugaresSinOpinionesAJSON = async () => {
    try {
        const [snapLugares, snapOpiniones] = await Promise.all([
            getDocs(collection(db, 'lugares_turisticos_scrapped')),
            getDocs(collection(db, 'opiniones_lugares'))
        ]);

        const idsConOpiniones = new Set<string>();
        snapOpiniones.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.lugarId) {
                idsConOpiniones.add(data.lugarId);
            }
        });

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

        const resultadoJSON = {
            fechaExportacion: new Date().toISOString(),
            totalLugaresSinOpiniones: lugaresSinOpiniones.length,
            lugares: lugaresSinOpiniones
        };

        if (typeof window !== "undefined") {
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
        }

        return resultadoJSON;
    } catch {
        return null;
    }
};