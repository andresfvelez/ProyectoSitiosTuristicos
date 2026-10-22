import React, { useState } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { guardarDestino } from "../../services/lugaresService";
import { db } from "../../firebase/firebaseConfig";
import { GEMINI_API_KEY, SERPER_API_KEY_ENCRYPTED } from "../../env";
import nlp from "compromise";
import {LugarTuristico} from "../models/LugarTuristico";

const ScrapperMejorado = () => {

    const COORDENADAS_MAESTRAS_COLOMBIA: { [key: string]: { lat: number, lng: number } } = {
        "amazonas": { lat: -1.4419, lng: -71.5724 }, "antioquia": { lat: 6.2442, lng: -75.5812 },
        "arauca": { lat: 7.0847, lng: -70.7591 }, "atlántico": { lat: 10.9639, lng: -74.7964 },
        "bolívar": { lat: 10.3910, lng: -75.4794 }, "boyacá": { lat: 5.5353, lng: -73.3678 },
        "caldas": { lat: 5.0689, lng: -75.5174 }, "caquetá": { lat: 1.6144, lng: -75.6062 },
        "casanare": { lat: 5.3377, lng: -72.3959 }, "cauca": { lat: 2.4419, lng: -76.6063 },
        "cesar": { lat: 10.4631, lng: -73.2532 }, "chocó": { lat: 5.6919, lng: -76.6583 },
        "córdoba": { lat: 8.7479, lng: -75.8814 }, "cundinamarca": { lat: 4.6097, lng: -74.0817 },
        "guainía": { lat: 3.8653, lng: -67.9239 }, "guaviare": { lat: 2.5656, lng: -72.6459 },
        "huila": { lat: 2.5359, lng: -75.5277 }, "la guajira": { lat: 11.5444, lng: -72.9069 },
        "magdalena": { lat: 11.2408, lng: -74.1990 }, "meta": { lat: 4.1420, lng: -73.6266 },
        "nariño": { lat: 1.2136, lng: -77.2811 }, "norte de santander": { lat: 7.8939, lng: -72.5078 },
        "putumayo": { lat: 1.1498, lng: -76.6464 }, "quindío": { lat: 4.5339, lng: -75.6811 },
        "risaralda": { lat: 4.8133, lng: -75.6961 }, "san andrés y providencia": { lat: 12.5847, lng: -81.7006 },
        "santander": { lat: 7.1254, lng: -73.1198 }, "sucre": { lat: 9.3047, lng: -75.3978 },
        "tolima": { lat: 4.4389, lng: -75.2322 }, "valle del cauca": { lat: 3.4372, lng: -76.5225 },
        "vaupés": { lat: 1.1983, lng: -70.1733 }, "vichada": { lat: 4.4234, lng: -69.7924 },
        "bogotá d.c.": { lat: 4.7110, lng: -74.0721 }
    };

    // Agregamos 'total' dinámico al estado para controlar la barra de progreso
    const [status, setStatus] = useState({ loading: false, index: 0, total: 0, log: "Listo para iniciar" });

    const obtenerLlaveReal = async () => {
        try {
            const docRef = doc(db, "Constantes", "claves");
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) throw new Error("No existe la frase en Firebase");

            const fraseMaestra = docSnap.data().encriptado;
            const bytes = CryptoJS.AES.decrypt(SERPER_API_KEY_ENCRYPTED, fraseMaestra);
            const originalKey = bytes.toString(CryptoJS.enc.Utf8);
            return originalKey;
        } catch (error) {
            console.error("Error desencriptando:", error);
            return null;
        }
    };

    const obtenerLlaveRealGemini = async () => {
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


    const construirQueryEspecifico = (nombre: string, ciudad: string, deptoNombre: string) => {
        // 🧼 Eliminamos comillas dobles, simples, barras invertidas y diagonales
        let n = (nombre || "").replace(/["'\\\/]/g, "").trim();
        let c = (ciudad || "").replace(/["'\\\/]/g, "").trim();
        let d = (deptoNombre || "").replace(/["'\\\/]/g, "").trim();

        // Si el nombre es un compuesto con comas ("Vereda Jericó, Líbano..."),
        // cambiamos las comas por espacios para que Google no se tranque
        n = n.replace(/,/g, " ");

        // Retornamos el texto plano, completamente libre de comillas externas o internas
        return `${n} ${c} ${d} Colombia`.replace(/\s+/g, ' ').trim();
    };

    const buscarCoordenadasEnGoogleMaps = async (query: string, apiKeySerper: string) => {
        try {
            console.log(`📍 Buscando coordenadas reales en Google Maps para: ${query}`);

            const response = await fetch("https://google.serper.dev/places", {
                method: "POST",
                headers: {
                    "X-API-KEY": apiKeySerper ? apiKeySerper.trim() : "",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ q: query, gl: "co", hl: "es" }),
            });

            const data = await response.json();

            // Si Google Maps encuentra el lugar, extraemos su latitud y longitud reales
            if (data && data.places && data.places.length > 0) {
                const lugarEncontrado = data.places[0];
                if (lugarEncontrado.latitude && lugarEncontrado.longitude) {
                    return {
                        lat: parseFloat(lugarEncontrado.latitude),
                        lng: parseFloat(lugarEncontrado.longitude)
                    };
                }
            }
            return null; // Si no lo encuentra en el mapa
        } catch (error) {
            console.error("Error al consultar coordenadas en Serper Places:", error);
            return null;
        }
    };
    const repararGeolocalizacionAreaNatural = (deptoNombre: string) => {
        const llave = deptoNombre.toLowerCase().trim();
        // Si no encuentra el depto, usa el centro geográfico de Colombia
        const coordenadaBase = COORDENADAS_MAESTRAS_COLOMBIA[llave] || { lat: 4.570868, lng: -74.297333 };

        // 💡 EFECTO JITTER: Añadimos un pequeño desfase aleatorio de entre +/- 0.04 y 0.12 grados
        // Esto saca el pin del casco urbano y lo tira a las montañas/regiones verdes circundantes
        const factorDispersion = 0.16; // Amplitud del radio en el mapa
        const randomLat = (Math.random() - 0.5) * factorDispersion;
        const randomLng = (Math.random() - 0.5) * factorDispersion;

        return {
            lat: coordenadaBase.lat + randomLat,
            lng: coordenadaBase.lng + randomLng
        };
    };

    const clasificarLugarManualmente = (lugar: any) => {
        const desc = (lugar.description || "").toLowerCase();
        const depto = (lugar.department?.name || "").toLowerCase();

        let categoria = "Cultura";
        if (desc.includes("parque") || desc.includes("reserva") || desc.includes("río") || desc.includes("naturaleza") || desc.includes("área")) categoria = "Naturaleza";
        if (desc.includes("extremo") || desc.includes("escalada") || desc.includes("trekking") || desc.includes("senderismo")) categoria = "Aventura";
        if (desc.includes("comida") || desc.includes("plato") || desc.includes("sabor") || desc.includes("gastronó")) categoria = "Gastronomía";
        if (desc.includes("spa") || desc.includes("termas") || desc.includes("descanso")) categoria = "Relax";

        let perfil = ["Amigos", "Pareja"];
        if (categoria === "Relax" || categoria === "Cultura") perfil.push("Familia");
        if (categoria === "Aventura") perfil.push("Solo");

        let clima = "Templado";
        const calientes = ["bolívar", "atlántico", "magdalena", "guajira", "córdoba", "sucre", "valle del cauca", "antioquia"];
        const frios = ["boyacá", "cundinamarca", "nariño", "santander"];
        if (calientes.some(c => depto.includes(c))) clima = "Cálido";
        if (frios.some(f => depto.includes(f))) clima = "Frío";

        const popularidad = Math.random() > 0.7;

        let gasto = 2;
        if (categoria === "Naturaleza") gasto = 1;
        if (categoria === "Urbano" || categoria === "Gastronomía") gasto = 3;

        return {
            categoriaPrincipal: categoria,
            perfilUsuario: perfil,
            nivelGasto: gasto,
            clima: clima,
            popularidad: popularidad,
            estanciaSugerida: categoria === "Urbano" ? "Pasadía" : "Fin de semana",
            dificultad: categoria === "Aventura" ? "Alto (Deporte)" : "Bajo (Relax)",
            entorno: categoria === "Urbano" ? "Urbano" : "Rural",
            acceso: categoria === "Aventura" ? "Caminata/Lancha" : "Vehículo simple"
        };
    };

    // Lista masiva y variada de nombres y alias para evitar colisiones lógicas
    const generarNombreAleatorio = () => {
        const nombres = [
            "Juan", "María", "Carlos", "Andrés", "Luisa", "Diego", "Paula", "Ricardo", "Elena", "Camila",
            "Santiago", "Valentina", "Mateo", "Sebastian", "Daniela", "Nicolas", "Mariana", "Gabriel",
            "Isabella", "Lucas", "Sofia", "Felipe", "Natalia", "Camilo", "Laura", "Javier", "Gloria",
            "Fernando", "Patricia", "Alejandro", "Carolina", "Manuel", "Angela", "Esteban", "Diana"
        ];
        const apellidos = [
            "Rodríguez", "Pérez", "Gómez", "López", "García", "Martínez", "V.", "M.", "S.", "Restrepo",
            "Jaramillo", "Castro", "Vargas", "Silva", "Rojas", "Mendoza", "Ortiz", "Morales", "San_Viajero",
            "ExplorerCol", "Aventurero99", "Ruta_Colombia", "Mochilero_Co", "ViajesEco", "RoloViajero"
        ];
        return `${nombres[Math.floor(Math.random() * nombres.length)]} ${apellidos[Math.floor(Math.random() * apellidos.length)]}`;
    };

    const curarMetadataYValidarIA = async (nombreLugar: string, deptoNombre: string) => {
        try {
            const apiKeyGemini = await obtenerLlaveRealGemini();
            if (!apiKeyGemini) return { esValido: false, nombreMejorado: nombreLugar, descripcion: "", actividades: [], puntoReferencia: "" };

            const promptValidacion = `
                Actúa como un experto geógrafo y auditor de turismo en Colombia. Analiza el destino "${nombreLugar}" en el departamento de ${deptoNombre}.
                
                Tu tarea principal es resolver la ambigüedad de nombres planos y estructurar el JSON:
                1. "nombreMejorado": Si el nombre original es ambiguo, incompleto o muy seco, transfórmalo añadiéndole su tipología real para que un usuario sepa qué es (ejemplo: cambia 'La Ceja' a 'Vereda La Ceja', 'El Balcón' a 'Mirador El Balcón', 'Fin del Mundo' a 'Cascadas Fin del Mundo', 'San José' a 'Corregimiento San José'). Si el nombre ya es explícito y claro, déjalo igual.
                2. "esValido": Define si el lugar posee un atractivo visual, natural o cultural real para un turista. Si es una calle comercial cualquiera o un error de duplicado, pon false.
                3. "descripcion": Una descripción atractiva de máx 3 oraciones usando el nombre mejorado.
                4. "actividades": Un array con las 3 principales actividades recreativas que se pueden hacer allí.
                5. "puntoReferencia": Indicación humana corta de su ubicación.

                Devuelve EXCLUSIVAMENTE un JSON plano sin bloques markdown \`\`\`:
                {
                  "esValido": true,
                  "nombreMejorado": "Nombre Claro y Descriptivo",
                  "descripcion": "...",
                  "actividades": ["Actividad 1", "Actividad 2", "Actividad 3"],
                  "puntoReferencia": "..."
                }
            `;

            const modelName = "gemini-3.1-flash-lite-preview";
            const responseGemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKeyGemini.trim()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptValidacion }] }], generationConfig: { temperature: 0.2 } })
            });
            const dataGemini = await responseGemini.json();
            return JSON.parse(dataGemini.candidates[0].content.parts[0].text.trim());
        } catch (error) {
            return { esValido: true, nombreMejorado: nombreLugar, descripcion: "Destino turístico en Colombia.", actividades: ["Ecoturismo"], puntoReferencia: "Región Andina" };
        }
    };
    const buscarOpinionesEnInternet = async (nombreFinal: string, ciudadNombre: string, deptoNombre: string, apiKeySerper: string) => {
        try {

            const queryContextualizado = construirQueryEspecifico(nombreFinal, ciudadNombre, deptoNombre);
            const queries = [`${queryContextualizado} opiniones experiencia`, `${queryContextualizado} reseñas`];

            // 🔍 LOG DE CONTROL: Ver exactamente qué texto se le envía a Google
            console.log(`🔎 Buscando en Google: "${queries[0]}"`);

            const promesas = queries.map(queryStr =>
                fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: {
                        "X-API-KEY": apiKeySerper ? apiKeySerper.trim() : "",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ q: queryStr, gl: "co", hl: "es" }),
                }).then(res => res.json())
            );
            const apiKeyGemini = await obtenerLlaveRealGemini();
            if (!apiKeyGemini) throw new Error("No se pudo obtener la API Key");

            const resultados = await Promise.all(promesas);

            const mapaUnicos = new Map();
            resultados.forEach(res => {
                if (res.organic) {
                    res.organic.forEach((item: any) => {
                        if (item.link && item.snippet) {
                            mapaUnicos.set(item.link, item.snippet);
                        }
                    });
                }
            });

            const fragmentosCrudos = Array.from(mapaUnicos.values());
            if (fragmentosCrudos.length === 0) return [];

            // --- PIPELINE NLP CON COMPROMISE Y REGEX ---
            const fragmentosSanitizados = fragmentosCrudos.map((snippet: any) => {
                // 1. Instanciar el documento NLP con el fragmento de internet
                let doc = nlp(snippet);

                // 2. Normalización lingüística base de la API
                doc.normalize({ whitespace: true, punctuation: true, case: false });

                // 3. FILTRADO INTELIGENTE: Escaneamos oración por oración usando la API de compromise
                doc.sentences().forEach((sentence: { has: (arg0: string) => any; remove: () => void; }) => {
                    // Definimos un patrón de palabras comerciales, de contacto o de redes
                    const patronBasura = '(reserva|llama|contacto|whatsapp|teléfono|precio|dólares|pesos|instagram|facebook|click|suscríbete|vlog|youtube|sígueme|guía)';

                    if (sentence.has(patronBasura)) {
                        // La API de compromise elimina físicamente la oración que hace match del documento
                        sentence.remove();
                    }
                });

                // 4. CRITERIO CUALITATIVO: Nos aseguramos de que lo que quede sea una idea estructurada.
                // Filtramos para conservar solo oraciones que aporten juicios de valor (Verbos o Adjetivos)
                // Esto destruye textos tipo "Inicio > Colombia > Hoteles" o fechas sueltas.
                let oracionesValidas = doc.sentences().filter((s: { has: (arg0: string) => any; }) => {
                    return s.has('#Verb') || s.has('#Adjective');
                });

                // 5. Reconstruimos el texto limpio combinando las oraciones supervivientes
                let textoLimpioNLP = oracionesValidas.text();

                // 6. Micro-limpieza con Regex para remanentes técnicos imposibles para NLP (URLs, Emails)
                textoLimpioNLP = textoLimpioNLP
                    .replace(/(https?:\/\/[^\s]+)/g, '')
                    .replace(/[\w.-]+@[\w.-]+\.[\w]+/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                return textoLimpioNLP;
            }).filter(texto => texto.length > 35); // Filtro de longitud más estricto porque el NLP ya purgó la basura


            if (fragmentosSanitizados.length === 0) return [];

            const promptConstruido = `
            Actúa como un experto en curaduría de datos turísticos para una aplicación de software. 
            A continuación, te proporcionaré una lista de fragmentos de texto (snippets) extraídos de internet sobre el destino turístico llamado "${nombreFinal}".
            
            Tu trabajo es realizar un proceso de curaduría, limpieza y análisis de sentimiento sobre estos fragmentos para convertirlos en reseñas u opiniones realistas escritas por usuarios humanos.

            Requisitos estrictos para procesar cada fragmento:
            1. Debe sonar como una opinión turística real y espontánea escrita por un viajero en primera persona.
            2. Elimina fragmentos enciclopédicos (estilo Wikipedia), promociones de canales de YouTube/Vlogs ("quédate que aquí te cuento"), publicidad de agencias, marcas de tiempo ("Hace 3 días") y números de teléfono.
            3. Si el fragmento viene cortado o trunco al final, completa la oración de forma coherente o recórtala de modo que termine con un punto final de manera completamente natural.
            4. Analiza el sentimiento real del texto resultante y asígnale una puntuación numérica coherente del 1 al 5 (1: Pésimo, 2: Malo, 3: Neutral/Regular, 4: Bueno, 5: Excelente). Mantén una distribución realista (incluye opiniones buenas, regulares y malas según lo que exprese el texto).
            5. Descarta por completo aquellos fragmentos que sean pura publicidad comercial, que solo contengan datos técnicos del sitio o que no aporten valor cualitativo.

            Devuelve la información EXCLUSIVAMENTE como un arreglo en formato JSON puro, sin bloques de código Markdown (\`\`\`), sin textos introductorios ni explicaciones. Debe cumplir exactamente con esta estructura:
            [
              {
                "comentario": "Texto limpio, humano, completo y con sentido sobre el lugar.",
                "puntuacion": 4
              }
            ]

            Aquí están los fragmentos a procesar:
            ${JSON.stringify(fragmentosSanitizados)}
        `;

            const modelName = "gemini-3.1-flash-lite-preview";
            const endpointGemini = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKeyGemini.trim()}`;

            const responseGemini = await fetch(endpointGemini, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptConstruido }] }],
                    generationConfig: {
                        temperature: 0.1,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                })
            });
            const dataGemini = await responseGemini.json();
            const textoJsonCrudo = dataGemini.candidates[0].content.parts[0].text;

            const opinionesCuradas = JSON.parse(textoJsonCrudo.trim());

            // Mapeo agregando el 'usuarioId' alfa-numérico aleatorio para Surprise API
            return opinionesCuradas.map((op: any) => ({
                usuarioId: `usr_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36).slice(-3)}`,
                usuario: generarNombreAleatorio(),
                comentario: op.comentario,
                puntuacion: op.puntuacion,
                fuente: "Curado mediante IA",
                fecha: "Mayo 2026"
            }));

        } catch (error) {
            console.error("Error en el pipeline de curaduría con Gemini:", error);
            return [];
        }
    };

    const urlToFile = async (url: string, fileName: string): Promise<File | null> => {
        try {
            const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1000&h=600&fit=cover&a=t&output=jpg&q=85`;
            const response = await fetch(proxyUrl);
            if (!response.ok) return null;
            const blob = await response.blob();
            if (blob.size < 15000) return null;
            return new File([blob], fileName, { type: 'image/jpeg' });
        } catch (error) {
            return null;
        }
    };

    const buscarImagenesReales = async (nombreFinal: string, ciudadNombre: string, deptoNombre: string, descripcion: string, apiKey: string) => {
        try {
            let queryContextualizado = construirQueryEspecifico(nombreFinal, ciudadNombre, deptoNombre);
            const textoAnalisis = (nombreFinal + " " + descripcion).toLowerCase();

            // 🏔️ Filtro 1: Antinieve (Ya lo teníamos armado)
            if (!textoAnalisis.includes("nevado") && !textoAnalisis.includes("cocuy") && !textoAnalisis.includes("glaciar")) {
                queryContextualizado += " -nieve -snow -nevado -glacier -winter";
            }

            // 🏝️ Filtro 2: Anti-Playas Falsas para el Caribe interior
            // Si es un departamento costeño pero el texto dice que es campo/bosque, bloqueamos el mar
            const deptosCostenos = ["bolívar", "bolivar", "magdalena", "atlántico", "atlantico", "sucre", "córdoba", "cordoba"];
            const esDeptoCosteno = deptosCostenos.includes(deptoNombre.toLowerCase().trim());

            const esEntornoInterior = textoAnalisis.includes("rural") ||
                textoAnalisis.includes("campesina") ||
                textoAnalisis.includes("vereda") ||
                textoAnalisis.includes("montaña") ||
                textoAnalisis.includes("sendero");

            const noEsDestinoDePlaya = !textoAnalisis.includes("playa") &&
                !textoAnalisis.includes("mar ") &&
                !textoAnalisis.includes("isla") &&
                !textoAnalisis.includes("spa");

            if (esDeptoCosteno && esEntornoInterior && noEsDestinoDePlaya) {
                // Mandamos un bloqueo masivo de términos caribeños urbanos/playeros
                queryContextualizado += " -playa -mar -isla -beach -ocean -cartagena -baru -bocagrande";
            }

            console.log(`📸 Buscando imágenes reales con filtro estricto: "${queryContextualizado}"`);

            const response = await fetch("https://google.serper.dev/images", {
                method: "POST",
                headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
                body: JSON.stringify({ q: queryContextualizado, gl: "co", hl: "es" }),
            });
            const data = await response.json();
            return data.images?.slice(0, 3).map((img: any) => img.imageUrl) || [];
        } catch (error) {
            console.error("Error en buscador de imágenes:", error);
            return [];
        }
    };


    const ejecutarMigracionTotal = async () => {
        setStatus({ loading: true, index: 0, total: 0, log: "Autenticando y recuperando llaves..." });

        const apiKey = await obtenerLlaveReal();
        if(!apiKey) {
            setStatus({ loading: false, index: 0, total: 0, log: "Error: No se pudo desencriptar la llave." });
            return;
        }

        let poolRegistrosSurprise: any[] = [];
        try {
            // --- CONEXIÓN MULTI-ENDPOINT (Atracciones + Naturaleza) ---
            setStatus(s => ({ ...s, log: "Descargando catálogos turísticos y ecológicos..." }));
            const [resAtracciones, resNaturales] = await Promise.all([
                fetch('https://api-colombia.com/api/v1/TouristicAttraction').then(r => r.json()),
                fetch('https://api-colombia.com/api/v1/NaturalArea').then(r => r.json())
            ]);

            const departamentosLista = await fetch('https://api-colombia.com/api/v1/Department').then(r => r.json());
            const mapaDeptos = new Map(departamentosLista.map((d: any) => [d.id, d.name]));

            console.log(resNaturales)

            const mapaFiltrado = new Map();
            const regexNombreBasura = /\s\d+$|\s[IVXLCDM]+$/i;
            [...resAtracciones, ...resNaturales].forEach(item => {
                if (item.name && item.name.length > 3) {
                    const nombreLimpio = item.name.trim();

                    // 💡 SÓLO dejamos pasar el lugar si NO termina en números basura
                    if (!regexNombreBasura.test(nombreLimpio)) {
                        mapaFiltrado.set(nombreLimpio.toLowerCase(), item);
                    }
                }
            });

            console.log(mapaFiltrado)
            const seleccionados = Array.from(mapaFiltrado.values()).sort(() => 0.5 - Math.random()).slice(0, 280);
            const totalLugares = seleccionados.length;
            setStatus(s => ({ ...s, total: totalLugares, log: `Catálogo optimizado a ${totalLugares} lugares.` }));
            setStatus(s => ({ ...s, total: totalLugares, log: `Total a procesar: ${totalLugares} destinos.` }));

            for (let i = 0; i < totalLugares; i++) {
                const lugar = seleccionados[i];
                const esAreaNatural = !lugar.city;


                // CRUCE LOGÍSITICO CON EL MAPA DE DEPARTAMENTOS
                let deptoNombre = "Colombia";
                if (!esAreaNatural && lugar.department?.name) {
                    deptoNombre = lugar.department.name;
                } else if (esAreaNatural && lugar.departmentId && mapaDeptos.has(lugar.departmentId)) {
                    deptoNombre = mapaDeptos.get(lugar.departmentId) as string;
                }

                const metaIA = await curarMetadataYValidarIA(lugar.name, deptoNombre);

                if (!metaIA.esValido) {
                    console.warn(`🛑 Descartado por baja relevancia turística: ${lugar.name}`);
                    continue;
                }

                // Definimos el nuevo estándar de nombre para todo el flujo
                const nombreFinal = metaIA.nombreMejorado || lugar.name;
                const ciudadNombre = esAreaNatural ? "" : (lugar.city?.name || deptoNombre);
                setStatus(s => ({ ...s, index: i + 1, log: `(${i + 1}/${totalLugares}) Buscando opiniones para: ${lugar.name}...` }));

                const opiniones = await buscarOpinionesEnInternet(nombreFinal, esAreaNatural ? "" : ciudadNombre, deptoNombre, apiKey); opiniones.forEach((op: any) => {
                    poolRegistrosSurprise.push({ user_id: op.usuarioId, item_id: nombreFinal, rating: op.puntuacion });
                });

                const suma = opiniones.reduce((acc: any, op: { puntuacion: any; }) => acc + op.puntuacion, 0);
                const promedio = opiniones.length > 0
                    ? (suma / opiniones.length).toFixed(1)
                    : "4.2";

                let urls = await buscarImagenesReales(nombreFinal, ciudadNombre, deptoNombre, metaIA.descripcion, apiKey);

// 🌟 NUEVO PLAN B PARA IMÁGENES: Si Google no tiene fotos del lugar exacto,
// no usamos fotos aleatorias de teteras. Buscamos un paisaje real del mismo departamento.
                if (urls.length === 0) {
                    console.warn(`⚠️ Cero imágenes exactas para [${nombreFinal}]. Aplicando paisaje de respaldo de ${deptoNombre}...`);
                    try {
                        const queryRespaldo = `Paisaje natural campo rural ${deptoNombre} Colombia -ciudad -personas -comida`;
                        const respRespaldo = await fetch("https://google.serper.dev/images", {
                            method: "POST",
                            headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
                            body: JSON.stringify({ q: queryRespaldo, gl: "co", hl: "es" }),
                        });
                        const dataRespaldo = await respRespaldo.json();
                        // Tomamos 2 fotos de respaldo del departamento
                        urls = dataRespaldo.images?.slice(0, 2).map((img: any) => img.imageUrl) || [];
                    } catch (error) {
                        console.error("Fallo al buscar imagen de respaldo geográfico", error);
                    }
                }

                // Procedemos a procesar y descargar las URLs encontradas (sean exactas o del depto)
                const promesas = urls.map((url: string, idx: any) => urlToFile(url, `${nombreFinal.replace(/\s/g, '_')}_${idx}.jpg`));
                let fotosDescargadas = (await Promise.all(promesas)).filter((f): f is File => f !== null);

                // 🌟 PLAN C (Súper emergencia sin teteras): Si Google se cae por completo,
                // forzamos una búsqueda en un banco de imágenes exclusivamente de paisajes (landscape)
                if (fotosDescargadas.length === 0) {
                    const fallback = await urlToFile(`https://loremflickr.com/1000/600/landscape,jungle?lock=${Math.floor(Math.random() * 1000)}`, "respaldo_naturaleza.jpg");
                    if (fallback) fotosDescargadas.push(fallback);
                }


                const clasificacion = clasificarLugarManualmente(lugar);


                let latOriginal = parseFloat(lugar.latitude);
                let lngOriginal = parseFloat(lugar.longitude);

               const tieneCoordenadasValidasAPI = !isNaN(latOriginal) && !isNaN(lngOriginal) &&
                    latOriginal >= -4.5 && latOriginal <= 13.0 &&
                    lngOriginal >= -79.5 && lngOriginal <= -66.0 &&
                    latOriginal !== 0 && lngOriginal !== 0;

                let ubicacionValida = null;

                if (tieneCoordenadasValidasAPI) {
                    // 🟢 PLAN A: La API original tiene coordenadas humanas y reales.
                    ubicacionValida = { lat: latOriginal, lng: lngOriginal };
                } else {
                    // 🔵 PLAN B (Info de Internet): La API falló, le preguntamos a Google Maps en vivo
                    const queryParaMapas = `${nombreFinal} ${ciudadNombre} ${deptoNombre} Colombia`.replace(/\s+/g, ' ').trim();
                    const coordenadasInternet = await buscarCoordenadasEnGoogleMaps(queryParaMapas, apiKey);

                    if (coordenadasInternet) {
                        ubicacionValida = coordenadasInternet;
                        console.log(`✅ Coordenadas reales de Internet para [${nombreFinal}]:`, ubicacionValida);
                    } else {
                        // 🟡 PLAN C (Respaldo): Si ni Google Maps lo conoce, lo mandamos al depto con Jitter
                        console.warn(`⚠️ Lugar no mapeado en la web: [${nombreFinal}]. Aplicando jitter regional.`);
                        ubicacionValida = repararGeolocalizacionAreaNatural(deptoNombre);
                    }
                }




                const payload: any = {
                    nombre: nombreFinal,
                    descripcion: lugar.description || metaIA.descripcion || "",
                    // Usamos 'aventura' por defecto para los atractivos/áreas naturales del scraper
                    categoria: "aventura",
                    ciudad: lugar.city?.name || "Colombia",
                    pais: "Colombia",
                    puntuacion: parseFloat(promedio) || 0,
                    minimo: 0,
                    recomendado: 1, // 👈 Corregido: antes decía 'recommended'

                    // 🆕 MAPEO A LAS NUEVAS PROPIEDADES UNIFICADAS
                    tagsEspeciales: Array.isArray(metaIA.actividades) ? metaIA.actividades : [], // 👈 Antes 'actividadesPrincipales'
                    servicios: [],
                    petFriendly: false,
                    accesibleSillaRuedas: false,
                    rnt: "",
                    unescoId: "",
                    contactoWhatsapp: "",
                    queLlevar: metaIA.puntoReferencia || "", // Reubicamos el punto de referencia temporalmente aquí si aplica

                    // --- CRITERIOS CLAVE PARA FILTRADO DE IA Y BÚSQUEDAS ---
                    categoriaPrincipal: clasificacion.categoriaPrincipal || "Atractivo Turístico",
                    perfilUsuario: clasificacion.perfilUsuario || ["Pareja", "Amigos"],
                    nivelGasto: Number(clasificacion.nivelGasto) || 2,
                    clima: clasificacion.clima || "Templado",
                    popularidad: clasificacion.popularidad ?? false,
                    estanciaSugerida: clasificacion.estanciaSugerida || "Fin de semana",
                    dificultad: clasificacion.dificultad || "Baja",
                    entorno: clasificacion.entorno || "Rural",
                    acceso: clasificacion.acceso || "Vehículo simple"
                };

                await guardarDestino(payload, fotosDescargadas, ubicacionValida,"sistema");

                setStatus(s => ({ ...s, log: `Esperando regulador de API...` }));
                await new Promise(r => setTimeout(r, 3000));
            }
            setStatus(s => ({ ...s, log: "Generando hoja de cálculo XLSX/XLS para Surprise..." }));
           exportarDatasetExcelSurprise(poolRegistrosSurprise);
            setStatus({ loading: false, index: totalLugares, total: totalLugares, log: `¡Migración Exitosa! ${totalLugares} destinos procesados de forma segura.` });

        } catch (error) {
            console.error(error);
            setStatus(s => ({ ...s, loading: false, log: "Error crítico en el proceso de migración." }));
        }
    };

    const exportarDatasetExcelSurprise = (listaRegistros: any[]) => {
        if (listaRegistros.length === 0) return;

        let xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:graph" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><Worksheet ss:Name="Surprise Dataset"><Table>';
        xml += '<Row><Cell><Data ss:Type="String">user_id</Data></Cell><Cell><Data ss:Type="String">item_id</Data></Cell><Cell><Data ss:Type="String">rating</Data></Cell></Row>';

        listaRegistros.forEach(reg => {
            const nombreLugarLimpio = reg.item_id.replace(/[<>&'"]/g, '');
            xml += `<Row><Cell><Data ss:Type="String">${reg.user_id}</Data></Cell><Cell><Data ss:Type="String">${nombreLugarLimpio}</Data></Cell><Cell><Data ss:Type="Number">${reg.rating}</Data></Cell></Row>`;
        });

        xml += '</Table></Worksheet></Workbook>';

        const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "dataset_surprise_grado.xls");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };



    return (
        <div style={{ padding: '20px', border: '2px solid #333', borderRadius: '10px', background: '#f9f9f9' }}>
            <h2 style={{ color: '#2c3e50' }}>🛠 Panel de Administración: Migrador Expandido (NLP + Multi-Endpoint)</h2>
            <p>Estado: <span style={{ color: status.loading ? '#e67e22' : '#27ae60' }}>{status.log}</span></p>

            {/* Barra de progreso dinámica */}
            <div style={{ width: '100%', background: '#eee', height: '25px', borderRadius: '15px', overflow: 'hidden', marginBottom: '15px' }}>
                <div style={{
                    width: `${status.total > 0 ? (status.index / status.total) * 100 : 0}%`,
                    background: '#27ae60',
                    height: '100%',
                    transition: 'width 0.3s ease'
                }}></div>
            </div>

            <button
                onClick={ejecutarMigracionTotal}
                disabled={status.loading}
                style={{
                    padding: '12px 24px',
                    background: status.loading ? '#95a5a6' : '#2980b9',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: status.loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                }}
            >
                {status.loading ? `Procesando (${status.index}/${status.total})...` : "🚀 Iniciar Migración Masiva Total"}
            </button>
        </div>
    );
};

export default ScrapperMejorado;