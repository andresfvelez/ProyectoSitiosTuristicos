import {addDoc, collection, deleteField, doc, getDocs, query, updateDoc, where} from "firebase/firestore";
import {db} from "../firebase/firebaseConfig";
import {OpinionFirebase} from "../Components/models/LugarTuristico";

export const limpiarCampoOpinionesOriginales = async () => {
    console.log("🧹 Iniciando limpieza del campo 'opiniones' en los lugares...");

    try {
        // 1. Obtener todos los documentos de la colección
        const snapshotLugares = await getDocs(collection(db, 'lugares_turisticos_scrapped'));
        let contadorModificados = 0;

        // 2. Iterar sobre cada lugar
        for (const docLugar of snapshotLugares.docs) {
            const data = docLugar.data();

            // Verificar si el campo 'opiniones' existe en el documento
            if ('opiniones' in data) {
                const lugarRef = doc(db, 'lugares_turisticos_scrapped', docLugar.id);

                // 3. Eliminar únicamente el campo 'opiniones'
                await updateDoc(lugarRef, {
                    opiniones: deleteField()
                });

                contadorModificados++;
                console.log(`🧼 Campo 'opiniones' eliminado de: ${data.nombre || docLugar.id}`);
            }
        }

        console.log(`\n✨ ¡Limpieza finalizada con éxito!`);
        console.log(`📊 Total de documentos limpiados: ${contadorModificados}`);

    } catch (error) {
        console.error("❌ Error durante el proceso de limpieza:", error);
    }
};


export const migrarOpinionesAColeccion = async () => {
    console.log("⏳ Iniciando migración de opiniones...");

    try {
        // 1. Obtener todos los lugares turísticos
        const snapshotLugares = await getDocs(collection(db, 'lugares_turisticos_scrapped'));
        const lugaresConError: Array<{ id: string; nombre: string; error: string; opinionesOriginal: any }> = [];

        // 2. Iterar sobre cada lugar
        for (const docLugar of snapshotLugares.docs) {
            const lugarData = docLugar.data();
            const lugarId = docLugar.id;
            const nombreLugar = lugarData.nombre;
            // Verificar si tiene el campo "opiniones" y si es un string (el JSON)
            if (lugarData.opiniones && typeof lugarData.opiniones === 'string') {
                try {
                    // Parsear el string JSON a un array de objetos

                    const opinionesArray = intentarParsearOArreglarJSON(lugarData.opiniones);

                    // 3. Iterar sobre cada opinión de este lugar
                    for (const opinion of opinionesArray) {

                        // --- VALIDACIÓN: ¿Ya existe este comentario? ---
                        // Buscamos en la nueva colección si ya hay un documento con el mismo lugarId y usuarioId
                        const opinionesRef = collection(db, 'opiniones_lugares');
                        const q = query(
                            opinionesRef,
                            where("lugarId", "==", lugarId),
                            where("usuarioId", "==", opinion.usuarioId)
                        );

                        const existeSnapshot = await getDocs(q);

                        if (existeSnapshot.empty) {
                            // Si está vacío (no existe), procedemos a migrarlo
                            const nuevaOpinion: OpinionFirebase = {
                                lugarId: lugarId,
                                usuarioId: opinion.usuarioId,
                                usuario: opinion.usuario,
                                comentario: opinion.comentario,
                                puntuacion: opinion.puntuacion,
                                fuente: opinion.fuente,
                                fecha: opinion.fecha,
                                createdAt: new Date().getTime() // Fecha de migración/creación
                            };

                            await addDoc(opinionesRef, nuevaOpinion);
                            console.log(`✅ Migrado: Comentario de ${opinion.usuario} para el lugar ${nombreLugar}`);
                        } else {
                            // Si ya existe, nos lo saltamos
                            console.log(`⚠️ Omitido (Ya existe): Comentario de ${opinion.usuario} para el lugar ${nombreLugar}`);
                        }
                    }
                } catch (parseError:any) {
                    console.warn(`⚠️ No se pudo auto-reparar el JSON en: ${nombreLugar} (${lugarId})`);

                    // Guardamos en la lista de dañados
                    lugaresConError.push({
                        id: lugarId,
                        nombre: nombreLugar,
                        error: parseError.message,
                        opinionesOriginal: lugarData.opiniones
                    });
                }
            }
        }

        console.log("🚀 ¡Migración finalizada con éxito!");
        if (lugaresConError.length > 0) {
            console.log("📋 Resumen de lugares dañados:");
            console.table(lugaresConError.map(e => ({ ID: e.id, Nombre: e.nombre, Error: e.error })));

            console.log("📥 Descargando archivo con el reporte de errores...");
            descargarReporteErrores(lugaresConError);
        }
    } catch (error) {
        console.error("❌ Error general en la migración:", error);
    }
};

const intentarParsearOArreglarJSON = (jsonString: string): any => {
    // 1. Intento parse estándar
    try {
        return JSON.parse(jsonString);
    } catch (firstError) {
        // 2. Si falla, aplicamos auto-reparación
        try {
            let reparado = jsonString
                // Arregla saltos de línea internos no escapados
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r")
                // Arregla valores de texto sin comillas: "clave":TextoSinComillas -> "clave":"TextoSinComillas"
                .replace(/:\s*([a-zA-ZÁÉÍÓÚáéíóúÑñ][^,}\]"]*)/g, (match, p1) => {
                    const valor = p1.trim();
                    // No tocar si es booleano o null
                    if (/^(true|false|null)$/i.test(valor)) return `: ${valor}`;
                    return `: "${valor}"`;
                });

            return JSON.parse(reparado);
        } catch (secondError) {
            // Si la auto-reparación tampoco pudo, lanzamos el error original
            throw firstError;
        }
    }
};

// --- HELPER 2: Descarga automáticamente un archivo JSON al navegador ---
const descargarReporteErrores = (errores: any[]) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(errores, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `lugares_dañados_opiniones_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
};