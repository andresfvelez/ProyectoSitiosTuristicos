import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { db } from '../../firebase/firebaseConfig';
import { GEMINI_API_KEY } from '../../env';

// 🔒 Candado de ejecución única
let estaEjecutandoEtiquetas = false;

// 🤖 MODELOS VÁLIDOS PROBADOS (Sin endpoints 404)
const MODELOS_GEMINI = [
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash"
];

const obtenerLlaveGemini = async (): Promise<string | null> => {
    try {
        const docRef = doc(db, "Constantes", "claves");
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        const bytes = CryptoJS.AES.decrypt(GEMINI_API_KEY, docSnap.data().encriptado);
        return bytes.toString(CryptoJS.enc.Utf8).trim();
    } catch (error) {
        return null;
    }
};

// 🤖 CONSULTA CON MANEJO DE RATE LIMIT (429) Y REVENTA DE VENTANA
const consultarGeminiParaEtiquetas = async (prompt: string, apiKeyGemini: string) => {
    for (const modelName of MODELOS_GEMINI) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKeyGemini}`;

        for (let intento = 1; intento <= 3; intento++) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.1, maxOutputTokens: 250 }
                    })
                });

                // Descartar modelos inexistentes inmediatamente
                if (response.status === 404) break;

                // Manejo de cuota (429): Pausa prolongada de 25s para resetear la ventana RPM de Google
                if (response.status === 429) {
                    console.warn(`🛑 Cuota saturada (429) en ${modelName}. Pausando 25 segundos para reiniciar ventana...`);
                    await new Promise(r => setTimeout(r, 25000));
                    continue;
                }

                // Manejo de sobrecarga temporal de servidor (503)
                if (response.status === 503) {
                    console.warn(`⏳ Servidor ocupado (503) en ${modelName}. Pausando 5 segundos...`);
                    await new Promise(r => setTimeout(r, 5000));
                    continue;
                }

                if (response.ok) {
                    const data = await response.json();
                    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (texto) return JSON.parse(texto.replace(/```json/g, "").replace(/```/g, "").trim());
                }
            } catch (error) {
                if (intento === 3) break;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
    return null;
};

// 🛡️ SANITIZACIÓN ESTRICTA DE VALORES
const sanitizarEtiquetas = (jsonIA: any) => {
    const asegurarArray = (arr: any, validos: string[], porDefecto: string[]) => {
        if (!Array.isArray(arr)) return porDefecto;
        const filtrados = arr.filter(item => validos.includes(item));
        return filtrados.length > 0 ? filtrados : porDefecto;
    };

    const asegurarString = (val: string, validos: string[], porDefecto: string) => {
        return validos.includes(val) ? val : porDefecto;
    };

    return {
        clima: asegurarString(jsonIA.clima, ["calido", "frio", "templado"], "templado"),
        entorno: asegurarString(jsonIA.entorno, ["naturaleza", "pueblo", "selva", "urbano"], "naturaleza"),
        rangoPresupuesto: asegurarString(jsonIA.rangoPresupuesto, ["economico", "moderado", "lujo"], "moderado"),
        tipoAcceso: asegurarString(jsonIA.tipoAcceso, ["carro", "bus", "4x4", "caminata"], "caminata"),
        ritmo: asegurarString(jsonIA.ritmo, ["relax", "moderado", "activo"], "moderado"),
        companiaIdeal: asegurarArray(jsonIA.companiaIdeal, ["solo", "pareja", "amigos", "familia"], ["amigos", "pareja"])
    };
};

// 🚀 MÉTODO PRINCIPAL DE ETIQUETADO
export const poblarEtiquetasAventura = async (onProgreso?: (log: string) => void) => {
    if (estaEjecutandoEtiquetas) {
        console.warn("⚠️ El proceso ya está activo.");
        return { exito: false };
    }

    estaEjecutandoEtiquetas = true;

    try {
        //const apiKeyGemini = await obtenerLlaveGemini();
        const apiKeyGemini = 'AQ.Ab8RN6IBhujSG6lgxVlhF1ttwCEKXpdmY0p9sh_1S4UNVcVK7g';
        if (!apiKeyGemini) throw new Error("Llave de Gemini no encontrada.");

        if (onProgreso) onProgreso("Descargando destinos...");

        const snapshot = await getDocs(collection(db, 'lugares_turisticos_scrapped'));

        const lugaresAventura = snapshot.docs.filter(docSnap => {
            const data = docSnap.data();
            return data.categoria != "hotel" && data.categoria != "restaurante";
        });

        const total = lugaresAventura.length;
        let actualizados = 0;
        let omitidos = 0;

        for (let i = 0; i < total; i++) {
            const lugarDoc = lugaresAventura[i];
            const data = lugarDoc.data();
            const lugarId = lugarDoc.id;

            // Omitir automáticamente los registros ya procesados previamente
            if (data.clima && data.entorno && data.tipoAcceso && data.clima !== "") {
                omitidos++;
                continue;
            }

            const logMsg = `(${i + 1}/${total}) 🤖 Analizando geografía de "${data.nombre}"...`;
            if (onProgreso) onProgreso(logMsg);
            console.log(logMsg);

            const prompt = `Actúa como un experto geógrafo de Colombia.
      Clasifica el siguiente destino turístico:
      - Nombre: "${data.nombre}"
      - Ubicación: "${data.ciudad || data.departamento || 'Colombia'}"
      - Descripción: "${data.descripcion || 'Sin descripción'}"

      REGLAS CLAVE:
      1. Si no es un páramo o nevado, y está en el Caribe, Pacífico, Llanos o Valle del Cauca, NO asignes "frio". Usa "calido" o "templado".
      
      Retorna ÚNICAMENTE un JSON plano (sin formato markdown \`\`\`):
      {
        "clima": "calido" | "frio" | "templado",
        "entorno": "naturaleza" | "pueblo" | "selva" | "urbano",
        "rangoPresupuesto": "economico" | "moderado" | "lujo",
        "tipoAcceso": "carro" | "bus" | "4x4" | "caminata",
        "ritmo": "relax" | "moderado" | "activo",
        "companiaIdeal": ["solo", "pareja", "amigos", "familia"]
      }`;

            const jsonCrudoIA = await consultarGeminiParaEtiquetas(prompt, apiKeyGemini);

            if (jsonCrudoIA) {
                const etiquetasSeguras = sanitizarEtiquetas(jsonCrudoIA);

                await updateDoc(doc(db, 'lugares_turisticos_scrapped', lugarId), {
                    clima: etiquetasSeguras.clima,
                    entorno: etiquetasSeguras.entorno,
                    rangoPresupuesto: etiquetasSeguras.rangoPresupuesto,
                    tipoAcceso: etiquetasSeguras.tipoAcceso,
                    ritmo: etiquetasSeguras.ritmo,
                    companiaIdeal: etiquetasSeguras.companiaIdeal
                });
                actualizados++;
            }

            // PAUSA DE SEGURIDAD DE 5 SEGUNDOS (Garantiza máximo 12 peticiones/minuto)
            await new Promise(r => setTimeout(r, 5000));
        }

        const msj = `✅ Proceso completado. Omitidos previamente: ${omitidos}. Nuevos etiquetados: ${actualizados}.`;
        if (onProgreso) onProgreso(msj);
        console.log(msj);

        return { exito: true, actualizados, omitidos };

    } catch (error) {
        console.error("Error en etiquetado:", error);
        return { exito: false, error };
    } finally {
        estaEjecutandoEtiquetas = false;
    }
};