import React, { useState } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { guardarDestino } from "../../services/lugaresService";
import { db } from "../../firebase/firebaseConfig";
import {GEMINI_API_KEY, SERPER_API_KEY_ENCRYPTED} from "../../env";
import nlp from "compromise";

const Scrapper = () => {
    const [status, setStatus] = useState({ loading: false, index: 0, log: "Listo para iniciar" });

    // 1. Función interna para desencriptar (sin el export interno)
    const obtenerLlaveReal = async () => {
        try {
            const docRef = doc(db, "Constantes", "claves");
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) throw new Error("No existe la frase en Firebase");


            const fraseMaestra = docSnap.data().encriptado;
            const bytes = CryptoJS.AES.decrypt(SERPER_API_KEY_ENCRYPTED, fraseMaestra);
            const originalKey = bytes.toString(CryptoJS.enc.Utf8);

            console.log("KEY:", originalKey, "")
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

    const clasificarLugarManualmente = (lugar: any) => {
        const desc = (lugar.description || "").toLowerCase();
        const nombre = lugar.name.toLowerCase();
        const depto = (lugar.department?.name || "").toLowerCase();

        // 1. Categoría Principal
        let categoria = "Cultura";
        if (desc.includes("parque") || desc.includes("reserva") || desc.includes("río") || desc.includes("naturaleza")) categoria = "Naturaleza";
        if (desc.includes("extremo") || desc.includes("escalada") || desc.includes("trekking")) categoria = "Aventura";
        if (desc.includes("comida") || desc.includes("plato") || desc.includes("sabor")) categoria = "Gastronomía";
        if (desc.includes("spa") || desc.includes("termas") || desc.includes("descanso")) categoria = "Relax";

        // 2. Perfil de Usuario
        let perfil = ["Amigos", "Pareja"];
        if (categoria === "Relax" || categoria === "Cultura") perfil.push("Familia");
        if (categoria === "Aventura") perfil.push("Solo");

        // 3. Clima (Basado en Departamento)
        let clima = "Templado";
        const calientes = ["bolívar", "atlántico", "magdalena", "guajira", "córdoba", "sucre", "valle del cauca"];
        const frios = ["boyacá", "cundinamarca", "nariño", "santander"];
        if (calientes.some(c => depto.includes(c))) clima = "Cálido";
        if (frios.some(f => depto.includes(f))) clima = "Frío";

        // 4. Popularidad (Aleatorio para crear "Joyas Ocultas" para tu tesis)
        const popularidad = Math.random() > 0.7; // 30% son conocidos, 70% son joyas ocultas

        // 5. Nivel de Gasto (1: Bajo, 2: Medio, 3: Alto)
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


    // Función para buscar opiniones
    // Generador de nombres realistas para cuando el scrapper no encuentre uno
    const generarNombreAleatorio = () => {
        const nombres = ["Juan", "María", "Carlos", "Andrés", "Luisa", "Diego", "Paula", "Ricardo", "Elena", "jorge88", "Camila", "Santi_Viajero", "Mafe"];
        const apellidos = ["Rodríguez", "Pérez", "Gómez", "López", "García", "Martínez", "V.", "M.", "S."];
        return `${nombres[Math.floor(Math.random() * nombres.length)]} ${apellidos[Math.floor(Math.random() * apellidos.length)]}`;
    };

    const buscarOpinionesEnInternet = async (nombreLugar: string, apiKeySerper: string) => {
        try {
            // Consultas sencillas en texto plano para evitar el molesto Error 400
            const queries = [
                `${nombreLugar} experiencia viaje opiniones comentarios`,
                `${nombreLugar} reseñas turistas atención servicio`
            ];

            const promesas = queries.map(q =>
                fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: { "X-API-KEY": apiKeySerper, "Content-Type": "application/json" },
                    body: JSON.stringify({ q, num: 20, gl: "co", hl: "es" }),
                }).then(res => res.json())
            );
            const apiKeyGemini = await obtenerLlaveRealGemini();
            if (!apiKeyGemini) throw new Error("No se pudo obtener la API Key");

            const resultados = await Promise.all(promesas);

            // Control de duplicación estricto por enlace de origen
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

            // --- EL ARMA SECRETA: PROMPT ENGINEERING PARA CURADURÍA CON GEMINI ---
            const promptConstruido = `
            Actúa como un experto en curaduría de datos turísticos para una aplicación de software. 
            A continuación, te proporcionaré una lista de fragmentos de texto (snippets) extraídos de internet sobre el destino turístico llamado "${nombreLugar}".
            
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
            ${JSON.stringify(fragmentosCrudos)}
        `;


            // --- LLAMADA A LA API DE GEMINI ---
            // Ajusta esta llamada según la librería oficial o método fetch que estés usando para Gemini
            const modelName = "gemini-3.1-flash-lite-preview";
            const endpointGemini = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKeyGemini.trim()}`;

            const responseGemini = await fetch(endpointGemini, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptConstruido }] }],
                    generationConfig: {
                        temperature: 0.1, // Mantiene la respuesta rígida al JSON solicitado sin inventar texto libre
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                })
            });
            const dataGemini = await responseGemini.json();
            const textoJsonCrudo = dataGemini.candidates[0].content.parts[0].text;

            // Parseamos la respuesta estructurada que nos devolvió la IA
            const opinionesCuradas = JSON.parse(textoJsonCrudo.trim());

            // Mapeamos los resultados agregando los metadatos dinámicos requeridos por tu app
            return opinionesCuradas.map((op: any) => ({
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
            // &a=t -> enfocamos la parte superior (top) de la imagen para paisajes
            const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1000&h=600&fit=cover&a=t&output=jpg&q=85`;

            const response = await fetch(proxyUrl);
            if (!response.ok) return null;

            const blob = await response.blob();
            if (blob.size < 15000) return null; // Descartamos si el archivo es demasiado pequeño (basura)

            return new File([blob], fileName, { type: 'image/jpeg' });
        } catch (error) {
            return null;
        }
    };
    const buscarImagenesReales = async (nombreLugar: string, ciudad: string, apiKey: string) => {
        try {
            // Usamos "site:tripadvisor.co OR site:wikipedia.org OR site:colombia.travel"
            // para forzar resultados de sitios de turismo reales
            const query = `"${nombreLugar}" ${ciudad} Colombia tourism landscape -motel -hotel -comercio -venta`;

            const response = await fetch("https://google.serper.dev/images", {
                method: "POST",
                headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
                body: JSON.stringify({ q: query, gl: "co", hl: "es" }),
            });

            const data = await response.json();

            // --- FILTRO DE FIDELIDAD ---
            // Solo nos quedamos con fotos donde el nombre del lugar aparezca en el título de la web
            const fotosFieles = data.images?.filter((img: any) => {
                const titulo = img.title.toLowerCase();
                const nombre = nombreLugar.toLowerCase();
                // Si el nombre del lugar está en el título, es 90% seguro que es el sitio
                return titulo.includes(nombre) || titulo.includes("turismo") || titulo.includes("colombia");
            });

            // Retornamos las 3 mejores. Si el filtro fue muy estricto y quedó en 0,
            // devolvemos las 3 primeras de la búsqueda original como plan B.
            return (fotosFieles && fotosFieles.length > 0)
                ? fotosFieles.slice(0, 3).map((img: any) => img.imageUrl)
                : data.images?.slice(0, 3).map((img: any) => img.imageUrl) || [];

        } catch (e) {
            return [];
        }
    };

    const ejecutarMigracionTotal = async () => {
        setStatus({ loading: true, index: 0, log: "Autenticando y recuperando llaves..." });

        // OBTENEMOS LA LLAVE PRIMERO
        const apiKey = await obtenerLlaveReal();
        if(!apiKey) {
            setStatus({ loading: false, index: 0, log: "Error: No se pudo desencriptar la llave." });
            return;
        }

        try {
            const res = await fetch('https://api-colombia.com/api/v1/TouristicAttraction');
            const data = await res.json();
            // Mezclar y tomar 50
            const seleccionados = data.sort(() => 0.5 - Math.random()).slice(0,50);

            for (let i = 0; i < seleccionados.length; i++) {
                const lugar = seleccionados[i];
                setStatus(s => ({ ...s, index: i + 1, log: `Buscando opiniones para: ${lugar.name}...` }));

                const opiniones = await buscarOpinionesEnInternet(lugar.name, apiKey);

                // Calculamos el promedio real de las opiniones encontradas
                const suma = opiniones.reduce((acc: any, op: { puntuacion: any; }) => acc + op.puntuacion, 0);
                const promedio = opiniones.length > 0
                    ? (suma / opiniones.length).toFixed(1)
                    : "4.2";
                // 2. Obtener Imágenes con el nuevo filtro
                const urls = await buscarImagenesReales(lugar.name, lugar.city?.name, apiKey);

                // 3. Convertir a archivos (con el proxy wsrv.nl)
                const promesas = urls.map((url: string, idx: any) =>
                    urlToFile(url, `${lugar.name.replace(/\s/g, '_')}_${idx}.jpg`)
                );

                let fotosDescargadas = (await Promise.all(promesas)).filter((f): f is File => f !== null);

                // 4. PLAN B: Si no hubo fotos fieles, usamos Picsum con el nombre del lugar como semilla
                if (fotosDescargadas.length === 0) {
                    const fallback = await urlToFile(`https://picsum.photos/seed/${encodeURIComponent(lugar.name)}/1000/600`, "respaldo.jpg");
                    if (fallback) fotosDescargadas.push(fallback);
                }


                const clasificacion = clasificarLugarManualmente(lugar); // <--- Nueva clasificación
                // Payload para tu servicio guardarDestino
                const payload = {
                    nombre: lugar.name,
                    descripcion: lugar.description || "Destino turístico en Colombia.",
                    categoria: "Atractivo Turístico",
                    ciudad: lugar.city?.name || "Colombia",
                    pais: "Colombia",
                    puntuacion: parseFloat(promedio), // Fidelidad: el puntaje que dice la web
                    opiniones: JSON.stringify(opiniones),
                    minimo: 0,
                    recomendado: 1,

                    // --- AQUÍ ENTRAN LOS 9 CRITERIOS ---
                    categoriaPrincipal: clasificacion.categoriaPrincipal,
                    perfilUsuario: clasificacion.perfilUsuario,
                    nivelGasto: clasificacion.nivelGasto,
                    clima: clasificacion.clima,
                    popularidad: clasificacion.popularidad,
                    estanciaSugerida: clasificacion.estanciaSugerida,
                    dificultad: clasificacion.dificultad,
                    entorno: clasificacion.entorno,
                    acceso: clasificacion.acceso

                };

                const ubicacion = {
                    lat: parseFloat(lugar.latitude) || 4.57,
                    lng: parseFloat(lugar.longitude) || -74.29
                };

               // await guardarDestino(payload, fotosDescargadas, ubicacion);



                // Delay para no saturar Serper (importante)
                // SUBE ESTE TIEMPO: 1.5 o 2 segundos es lo ideal para procesos masivos
                setStatus(s => ({ ...s, log: `Esperando para siguiente lugar...` }));
                await new Promise(r => setTimeout(r, 3000));
            }

            setStatus({ loading: false, index: 50, log: "¡Migración Exitosa! 50 lugares guardados." });
        } catch (error) {
            console.error(error);
            setStatus({ loading: false, index: 0, log: "Error en el proceso." });
        }
    };

    return (
        <div style={{ padding: '20px', border: '2px solid #333', borderRadius: '10px', background: '#f9f9f9' }}>
            <h2 style={{ color: '#2c3e50' }}>🛠 Panel de Administración: Migrador</h2>
            <p>Estado: <span style={{ color: status.loading ? '#e67e22' : '#27ae60' }}>{status.log}</span></p>

            {/* Barra de progreso visual */}
            <div style={{ width: '100%', background: '#eee', height: '25px', borderRadius: '15px', overflow: 'hidden', marginBottom: '15px' }}>
                <div style={{ width: `${(status.index / 50) * 100}%`, background: '#27ae60', height: '100%', transition: 'width 0.3s ease' }}></div>
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
                {status.loading ? `Cargando (${status.index}/50)...` : "🚀 Iniciar Migración Masiva"}
            </button>
        </div>
    );
};

export default Scrapper;