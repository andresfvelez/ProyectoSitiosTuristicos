import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { db } from '../../firebase/firebaseConfig';
import { GEMINI_API_KEY } from '../../env';

// 🔒 Candado de ejecución única en memoria para evitar hilos paralelos
let estaEjecutandoCuraduria = false;

// 🤖 LISTA DE MODELOS CANDIDATOS (EN ORDEN DE PRIORIDAD)
const MODELOS_GEMINI = [
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash",
    "gemini-1.5-flash-latest"
];

// 🔑 DESENCRIPTAR LLAVE DE GEMINI
const obtenerLlaveGemini = async (): Promise<string | null> => {
    try {
        const docRef = doc(db, "Constantes", "claves");
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;

        const fraseMaestra = docSnap.data().encriptado;
        const bytes = CryptoJS.AES.decrypt(GEMINI_API_KEY, fraseMaestra);
        return bytes.toString(CryptoJS.enc.Utf8).trim();
    } catch (error) {
        console.error("Error desencriptando la llave:", error);
        return null;
    }
};

// 🤖 CONSULTA ULTRA-RESILIENTE (MULTI-MODELO + 3 REINTENTOS POR MODELO)
const consultarGeminiSeguro = async (
    prompt: string,
    apiKeyGemini: string,
    maxTokens = 250
): Promise<string | null> => {
    for (const modelName of MODELOS_GEMINI) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKeyGemini}`;

        for (let intento = 1; intento <= 3; intento++) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens }
                    })
                });

                // Si la ruta del modelo no existe (404), saltar de inmediato al siguiente modelo
                if (response.status === 404) {
                    break;
                }

                // Si el servidor está sobrecargado (503/429), reintentar en el mismo modelo
                if (response.status === 503 || response.status === 429) {
                    console.warn(`⏳ [${modelName}] Ocupado (${response.status}). Reintento ${intento}/3 en ${intento * 2}s...`);
                    await new Promise(r => setTimeout(r, intento * 2000));
                    continue;
                }

                if (!response.ok) {
                    break; // Probar siguiente modelo si da otro error HTTP
                }

                const data = await response.json();
                const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (texto) return texto.trim();

            } catch (error) {
                if (intento === 3) break;
                await new Promise(r => setTimeout(r, 1500));
            }
        }
    }

    return null; // Fallaron todos los modelos y reintentos
};

// 📝 REESCRIBIR COMENTARIO PARA QUE COINCIDA CON LA NUEVA CALIFICACIÓN
const reescribirComentarioCoherente = async (
    comentarioOriginal: string,
    nuevaCalificacion: number,
    nombreLugar: string,
    apiKeyGemini: string
): Promise<string | null> => {
    const prompt = `Actúa como un viajero real. Reescribe este comentario sobre "${nombreLugar}" para que coincida exactamente con una calificación de ${nuevaCalificacion} sobre 5.0.
  - Si la nota es entre 3.8 y 4.2: Expresa una experiencia positiva pero menciona de forma natural un pequeño detalle a mejorar o un inconveniente menor (ej: vía de acceso inclinada, poca señal móvil, falta de comercios cerca o afluencia de gente).
  - Mantén un lenguaje espontáneo en primera persona.
  - Devuelve ÚNICAMENTE el texto del nuevo comentario, sin comillas ni explicaciones.

  Comentario original: "${comentarioOriginal}"`;

    return await consultarGeminiSeguro(prompt, apiKeyGemini, 200);
};

// 🏔️ GENERAR DESCRIPCIÓN ENRIQUECIDA SI ES GENÉRICA
const generarDescripcionMejorada = async (
    nombre: string,
    ciudad: string,
    apiKeyGemini: string
): Promise<string | null> => {
    const prompt = `Actúa como un experto en turismo de Colombia. Escribe una descripción atractiva, informativa y realista de exactamente 2 a 3 oraciones para el sitio turístico "${nombre}" ubicado en "${ciudad || 'Colombia'}". No utilices textos genéricos como 'Destino turístico en Colombia'. Devuelve ÚNICAMENTE el texto plano sin comillas ni etiquetas markdown.`;

    return await consultarGeminiSeguro(prompt, apiKeyGemini, 250);
};

// 💾 DESCARGAR REPORTE JSON DE FALLOS EN NAVEGADOR
const descargarReporteFallosJSON = (fallos: any[]) => {
    if (fallos.length === 0) return;

    const dataStr = JSON.stringify({
        fechaReporte: new Date().toISOString(),
        totalFallidos: fallos.length,
        lugaresConError: fallos
    }, null, 2);

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fallos_curaduria_gemini_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// 🚀 MÉTODO PRINCIPAL DE SANITIZACIÓN Y CURADURÍA
export const curarLugaresYComentariosDuplicados = async (
    onProgreso?: (log: string) => void
) => {
    // 🛡️ Prevenir ejecuciones dobles simultáneas (React Strict Mode / Doble Clic)
    if (estaEjecutandoCuraduria) {
        console.warn("⚠️ El proceso de curaduría ya está corriendo. Petición paralela omitida.");
        return { exito: false, mensaje: "Proceso activo" };
    }

    estaEjecutandoCuraduria = true;
    const lugaresFallidos: { id: string; nombre: string; motivo: string }[] = [];

    try {
        if (onProgreso) onProgreso("Iniciando auditoría profunda de Firestore...");

        const apiKeyGemini = await obtenerLlaveGemini();
        if (!apiKeyGemini) throw new Error("No se pudo obtener la API Key de Gemini.");

        // 1. Obtener colecciones
        const [snapLugares, snapOpiniones] = await Promise.all([
            getDocs(collection(db, 'lugares_turisticos_scrapped')),
            getDocs(collection(db, 'opiniones_lugares'))
        ]);

        // 2. Agrupar opiniones por lugarId
        const opinionesPorLugar: Record<string, { id: string; data: any }[]> = {};

        snapOpiniones.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const lugarId = data.lugarId;
            if (lugarId) {
                if (!opinionesPorLugar[lugarId]) {
                    opinionesPorLugar[lugarId] = [];
                }
                opinionesPorLugar[lugarId].push({ id: docSnap.id, data });
            }
        });

        let comentariosEliminados = 0;
        let comentariosAjustados = 0;
        let descripcionesMejoradas = 0;

        const totalLugares = snapLugares.docs.length;

        for (let i = 0; i < totalLugares; i++) {
            const lugarDoc = snapLugares.docs[i];
            const lugarId = lugarDoc.id;
            const lugarData = lugarDoc.data();
            const listadoOpiniones = opinionesPorLugar[lugarId] || [];

            const logMsg = `(${i + 1}/${totalLugares}) Procesando: "${lugarData.nombre}"...`;
            if (onProgreso) onProgreso(logMsg);
            console.log(logMsg);

            let huboFalloLugar = false;

            // --- PASO A: ELIMINAR DUPLICADOS EXACTOS O REPETIDOS ---
            const textosVistos = new Set<string>();
            const opinionesUnicas: { id: string; data: any }[] = [];

            for (const op of listadoOpiniones) {
                const textoLimpio = (op.data.comentario || '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '')
                    .trim();

                if (textosVistos.has(textoLimpio)) {
                    await deleteDoc(doc(db, 'opiniones_lugares', op.id));
                    comentariosEliminados++;
                } else {
                    textosVistos.add(textoLimpio);
                    opinionesUnicas.push(op);
                }
            }

            // --- PASO B: VARIAR RANGOS DE CALIFICACIÓN Y ADAPTAR TEXTO ---
            const todasSonCinco = opinionesUnicas.length >= 2 && opinionesUnicas.every(
                (op) => Number(op.data.puntuacion) === 5
            );

            const patronEstrellas = [4.5, 3.8, 4.2, 4.8, 4.0, 4.6, 3.9];

            if (todasSonCinco) {
                for (let j = 0; j < opinionesUnicas.length; j++) {
                    const op = opinionesUnicas[j];

                    if (j > 0) {
                        const nuevaCalificacion = patronEstrellas[(j - 1) % patronEstrellas.length];

                        const nuevoComentario = await reescribirComentarioCoherente(
                            op.data.comentario,
                            nuevaCalificacion,
                            lugarData.nombre || 'Destino',
                            apiKeyGemini
                        );

                        if (nuevoComentario) {
                            op.data.puntuacion = nuevaCalificacion;
                            op.data.comentario = nuevoComentario;

                            await updateDoc(doc(db, 'opiniones_lugares', op.id), {
                                puntuacion: nuevaCalificacion,
                                comentario: nuevoComentario
                            });

                            comentariosAjustados++;
                        } else {
                            huboFalloLugar = true;
                            lugaresFallidos.push({
                                id: lugarId,
                                nombre: lugarData.nombre || 'Sin nombre',
                                motivo: `Fallo al reescribir comentario ID: ${op.id}`
                            });
                        }

                        await new Promise((r) => setTimeout(r, 1000));
                    }
                }
            }

            // --- PASO C: MEJORAR DESCRIPCIÓN GENÉRICA CON GEMINI ---
            const descActual = (lugarData.descripcion || '').trim().toLowerCase();
            const esDescGenerica =
                descActual.length < 35 ||
                descActual.includes("destino turístico en colombia") ||
                descActual.includes("prueba");

            let nuevaDescripcion = lugarData.descripcion;

            if (esDescGenerica) {
                const descIA = await generarDescripcionMejorada(
                    lugarData.nombre || 'Destino',
                    lugarData.ciudad || lugarData.departamento || 'Colombia',
                    apiKeyGemini
                );

                if (descIA) {
                    nuevaDescripcion = descIA;
                    descripcionesMejoradas++;
                } else {
                    huboFalloLugar = true;
                    lugaresFallidos.push({
                        id: lugarId,
                        nombre: lugarData.nombre || 'Sin nombre',
                        motivo: 'Fallo al generar descripción enriquecida con IA'
                    });
                }
                await new Promise((r) => setTimeout(r, 1000));
            }

            // --- PASO D: RECALCULAR PROMEDIO REAL Y ACTUALIZAR DESTINO ---
            let nuevoPromedio = 0;
            if (opinionesUnicas.length > 0) {
                const suma = opinionesUnicas.reduce(
                    (acc, op) => acc + Number(op.data.puntuacion || 0),
                    0
                );
                nuevoPromedio = Number((suma / opinionesUnicas.length).toFixed(1));
            }

            const lugarRef = doc(db, 'lugares_turisticos_scrapped', lugarId);
            await updateDoc(lugarRef, {
                descripcion: nuevaDescripcion,
                puntuacion: nuevoPromedio
            });
        }

        // 💾 Si hubo lugares que no se pudieron procesar del todo por fallo de IA, generar JSON
        if (lugaresFallidos.length > 0) {
            descargarReporteFallosJSON(lugaresFallidos);
        }

        const resumenFinal = `✅ Curaduría finalizada. Eliminados: ${comentariosEliminados} duplicados | Ajustados: ${comentariosAjustados} comentarios/notas | Mejoradas: ${descripcionesMejoradas} descripciones | Fallidos: ${lugaresFallidos.length}.`;
        if (onProgreso) onProgreso(resumenFinal);
        console.log(resumenFinal);

        return {
            exito: true,
            comentariosEliminados,
            comentariosAjustados,
            descripcionesMejoradas,
            lugaresFallidos
        };
    } catch (error) {
        console.error("Error durante la curaduría masiva:", error);
        return { exito: false, error, lugaresFallidos };
    } finally {
        // 🔓 Liberar el candado al terminar (sea por éxito o por error)
        estaEjecutandoCuraduria = false;
    }
};