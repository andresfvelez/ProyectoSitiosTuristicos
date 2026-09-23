import { doc, getDoc, collection, getDocs, query, where, addDoc, updateDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import nlp from 'compromise';
import { db } from '../../firebase/firebaseConfig';
import { GEMINI_API_KEY, SERPER_API_KEY_ENCRYPTED } from '../../env';

// 🛑 REGISTROS DE PRUEBA A EXCLUIR
const IDs_BASURA = new Set([
    "FAMeEOVD39N7XoZLtuPf", // san juagan
    "3gpi3uBsO8KBIyOGxw4B", // asdas
    "KhBSuXV5jmYu7Hik8qDo", // prueba unesco
    "mO7KvmUEpDrYfwA11Qcr", // prueba unesco verificado
    "nrLeQ8BPiuWMOAAfPuVU", // prueba destino x
    "vZ6MyqYJabKMxKRjU8CH", // prueba rnt
    "x8aJ864TRa0B8E8N5NCa"  // paramaos (prueba sitio)
]);

// 📋 LISTA DE DESTINOS
const LUGARES_OBJETIVO = [
    { id: "I5Libuc70fgfQu2FNzio", nombre: "Iguakan", ciudad: "Colombia" },
    { id: "SLSkMFehLBzFfTyfXhek", nombre: "Gualanday", ciudad: "Colombia" },
    { id: "T7fMhNxANJ1RNFoB4W9F", nombre: "Reserva Natural El Ocarro", ciudad: "Colombia" }

];

// 🔒 Candado de ejecución única en memoria
let estaEjecutando = false;

const obtenerLlaveRealGemini = async () => {
    const docRef = doc(db, "Constantes", "claves");
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error("No existe la frase en Firebase");
    const fraseMaestra = docSnap.data().encriptado;
    const bytes = CryptoJS.AES.decrypt(GEMINI_API_KEY, fraseMaestra);
    return bytes.toString(CryptoJS.enc.Utf8).trim();
};

const construirQueryEspecifico = (nombre: string, ciudad: string) => {
    let n = (nombre || "").replace(/["'\\\/]/g, "").trim().replace(/,/g, " ");
    let c = (ciudad || "").replace(/["'\\\/]/g, "").trim();
    return `${n} ${c} Colombia`.replace(/\s+/g, ' ').trim();
};

const generarNombreAleatorio = () => {
    const nombres = ["Juan", "María", "Carlos", "Andrés", "Luisa", "Diego", "Paula", "Ricardo", "Elena", "Camila", "Santiago", "Valentina", "Mateo", "Sebastian", "Daniela", "Nicolas", "Mariana", "Gabriel"];
    const apellidos = ["Rodríguez", "Pérez", "Gómez", "López", "García", "Martínez", "V.", "M.", "Restrepo", "Jaramillo", "Castro", "Vargas", "Silva", "Rojas"];
    return `${nombres[Math.floor(Math.random() * nombres.length)]} ${apellidos[Math.floor(Math.random() * apellidos.length)]}`;
};

// 🤖 PETICIÓN A GEMINI CON REINTENTO INTERNO PARA PROTEGER LOS CRÉDITOS DE SERPER
const procesarPromptGeminiConReintento = async (
    prompt: string,
    apiKeyGemini: string,
    nombreLugar: string
): Promise<any[]> => {
    // 💡 Usando el modelo original estable
    const modelName = "gemini-3.1-flash-lite-preview";
    const endpointGemini = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKeyGemini}`;

    const maxReintentos = 3;

    for (let intento = 1; intento <= maxReintentos; intento++) {
        try {
            const response = await fetch(endpointGemini, {
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

            // Si Google responde con sobrecarga (503/429), reintentamos en el mismo ciclo sin re-consultar Serper
            if (response.status === 503 || response.status === 429) {
                console.warn(`⏳ Gemini ocupado (${response.status}). Reintentando (${intento}/${maxReintentos}) en ${intento * 3}s para "${nombreLugar}"...`);
                await new Promise(r => setTimeout(r, intento * 3000));
                continue;
            }

            if (!response.ok) {
                console.error(`Error HTTP ${response.status} de Gemini para ${nombreLugar}`);
                return [];
            }

            const dataGemini = await response.json();
            const textoJsonCrudo = dataGemini?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textoJsonCrudo) return [];

            const jsonLimpio = textoJsonCrudo.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(jsonLimpio);

        } catch (error) {
            console.error(`Intento ${intento} fallido en Gemini para ${nombreLugar}:`, error);
            if (intento < maxReintentos) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }

    return [];
};

// 🔎 BÚSQUEDA Y CURACIONAL CON MODELO ORIGINAL GEMINI 3.1
const buscarOpinionesEnInternet = async (
    nombreFinal: string,
    ciudadNombre: string,
    apiKeySerper: string,
    apiKeyGemini: string
) => {
    try {
        const queryContextualizado = construirQueryEspecifico(nombreFinal, ciudadNombre);
        const queries = [`${queryContextualizado} opiniones experiencia`, `${queryContextualizado} reseñas`];

        const promesas = queries.map(queryStr =>
            fetch("https://google.serper.dev/search", {
                method: "POST",
                headers: {
                    "X-API-KEY": apiKeySerper,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ q: queryStr, gl: "co", hl: "es" }),
            }).then(res => res.ok ? res.json() : null)
        );

        const resultados = await Promise.all(promesas);
        const mapaUnicos = new Map();

        resultados.forEach(res => {
            if (res?.organic) {
                res.organic.forEach((item: any) => {
                    if (item.link && item.snippet) {
                        mapaUnicos.set(item.link, item.snippet);
                    }
                });
            }
        });

        const fragmentosCrudos = Array.from(mapaUnicos.values());
        if (fragmentosCrudos.length === 0) return [];

        const fragmentosSanitizados = fragmentosCrudos.map((snippet: any) => {
            let docCompromise = nlp(snippet);
            docCompromise.normalize({ whitespace: true, punctuation: true, case: false });

            docCompromise.sentences().forEach((sentence: any) => {
                const patronBasura = '(reserva|llama|contacto|whatsapp|teléfono|precio|dólares|pesos|instagram|facebook|click|suscríbete|vlog|youtube|sígueme|guía)';
                if (sentence.has(patronBasura)) {
                    sentence.remove();
                }
            });

            let oracionesValidas = docCompromise.sentences().filter((s: any) => s.has('#Verb') || s.has('#Adjective'));
            let textoLimpioNLP = oracionesValidas.text();

            return textoLimpioNLP
                .replace(/(https?:\/\/[^\s]+)/g, '')
                .replace(/[\w.-]+@[\w.-]+\.[\w]+/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }).filter(texto => texto.length > 35);

        if (fragmentosSanitizados.length === 0) return [];

        const promptConstruido = `
      Actúa como un experto en curaduría de datos turísticos para una aplicación de software. 
      A continuación, te proporcionaré una lista de fragmentos de texto (snippets) extraídos de internet sobre el destino turístico llamado "${nombreFinal}".
      
      Tu trabajo es realizar un proceso de curaduría, limpieza y análisis de sentimiento sobre estos fragmentos para convertirlos en reseñas u opiniones realistas escritas por usuarios humanos.

      Requisitos estrictos para procesar cada fragmento:
      1. Debe sonar como una opinión turística real y espontánea escrita por un viajero en primera persona.
      2. Elimina fragmentos enciclopédicos (estilo Wikipedia), promociones de canales de YouTube/Vlogs, publicidad de agencias y números de teléfono.
      3. Si el fragmento viene cortado o trunco al final, completa la oración de forma coherente o recórtala de modo que termine con un punto final natural.
      4. Analiza el sentimiento real del texto resultante y asígnale una puntuación numérica coherente del 1 al 5.
      5. Descarta por completo los fragmentos comerciales o sin valor cualitativo.

      Devuelve la información EXCLUSIVAMENTE como un arreglo en formato JSON puro, sin bloques de código Markdown (\`\`\`json):
      [
        {
          "comentario": "Texto limpio, humano, completo y con sentido sobre el lugar.",
          "puntuacion": 4
        }
      ]

      Aquí están los fragmentos a procesar:
      ${JSON.stringify(fragmentosSanitizados)}
    `;

        // Llamada resiliente que protege los créditos de Serper
        const opinionesCuradas = await procesarPromptGeminiConReintento(promptConstruido, apiKeyGemini, nombreFinal);

        return opinionesCuradas.map((op: any) => ({
            usuarioId: `usr_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36).slice(-3)}`,
            usuario: generarNombreAleatorio(),
            comentario: op.comentario,
            puntuacion: op.puntuacion,
            fuente: "Curado mediante IA",
            fecha: "Mayo 2026"
        }));

    } catch (error) {
        console.error(`Error procesando opiniones para ${nombreFinal}:`, error);
        return [];
    }
};

// 🚀 MÉTODO PRINCIPAL
export const ejecutarPobladoComentariosFaltantes = async (
    onProgreso?: (index: number, total: number, log: string) => void
) => {
    // 🛡️ Bloqueo sincrónico estricto contra ejecuciones simultáneas
    if (estaEjecutando) {
        console.warn("⚠️ Ya hay una instancia corriendo. Petición paralela anulada.");
        return { exito: false, mensaje: "Proceso ya en marcha." };
    }

    estaEjecutando = true;

    try {
        const lugaresValidos = LUGARES_OBJETIVO.filter(lugar => !IDs_BASURA.has(lugar.id));
        const total = lugaresValidos.length;

        if (onProgreso) onProgreso(0, total, "Validando lugares pendientes en Firestore...");

        const [apiKeySerper, apiKeyGemini] = await Promise.all([
            "95967ab1c0aaf18334666f7ad25b99661897f648",
            obtenerLlaveRealGemini()
        ]);

        let insertadosTotal = 0;
        let omitidosTotal = 0;

        for (let i = 0; i < total; i++) {
            const lugar = lugaresValidos[i];

            // 🔍 COMPROBACIÓN EXPRESA EN FIRESTORE:
            // Si el lugar ya tiene comentarios en la BD, lo salta de inmediato sin consumir APIs
            const qExistentes = query(collection(db, 'opiniones_lugares'), where('lugarId', '==', lugar.id));
            const snapExistentes = await getDocs(qExistentes);

            if (!snapExistentes.empty) {
                omitidosTotal++;
                const logSkip = `(${i + 1}/${total}) ⏭️ "${lugar.nombre}" ya posee ${snapExistentes.size} opiniones en Firestore. Omitiendo.`;
                if (onProgreso) onProgreso(i + 1, total, logSkip);
                console.log(logSkip);
                continue;
            }

            const logTexto = `(${i + 1}/${total}) Buscando opiniones para: "${lugar.nombre}"...`;
            if (onProgreso) onProgreso(i + 1, total, logTexto);
            console.log(logTexto);

            // Extraer y procesar
            const opiniones = await buscarOpinionesEnInternet(
                lugar.nombre,
                lugar.ciudad,
                apiKeySerper,
                apiKeyGemini
            );

            if (opiniones.length > 0) {
                let sumaPuntuaciones = 0;

                for (const op of opiniones) {
                    await addDoc(collection(db, 'opiniones_lugares'), {
                        lugarId: lugar.id,
                        usuarioId: op.usuarioId,
                        usuario: op.usuario,
                        comentario: op.comentario,
                        puntuacion: op.puntuacion,
                        fuente: op.fuente,
                        fecha: op.fecha
                    });
                    sumaPuntuaciones += op.puntuacion;
                    insertadosTotal++;
                }

                const promedio = Number((sumaPuntuaciones / opiniones.length).toFixed(1));
                const lugarRef = doc(db, 'lugares_turisticos_scrapped', lugar.id);
                await updateDoc(lugarRef, { puntuacion: promedio });

                console.log(`✅ ${opiniones.length} opiniones registradas para "${lugar.nombre}". Promedio: ${promedio}`);
            } else {
                console.warn(`⚠️ No se encontraron snippet válidos para "${lugar.nombre}".`);
            }

            // Pausa reguladora
            await new Promise(r => setTimeout(r, 2000));
        }

        const resFinal = `Poblado completado. Omitidos: ${omitidosTotal}. Nuevos procesados: ${insertadosTotal}.`;
        if (onProgreso) onProgreso(total, total, resFinal);
        return { exito: true, totalLugares: total, insertadosTotal, omitidosTotal };

    } catch (error) {
        console.error("Error crítico procesando comentarios:", error);
        return { exito: false, error };
    } finally {
        estaEjecutando = false;
    }
};