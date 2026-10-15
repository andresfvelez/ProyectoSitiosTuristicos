import {
    addDoc,
    collection,
    deleteField,
    doc,
    getDocs,
    query,
    updateDoc,
    where
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { OpinionFirebase } from "../Components/models/LugarTuristico";

interface ErrorMigracion {
    id: string;
    nombre: string;
    error: string;
    opinionesOriginal: any;
}

interface ResultadoProceso {
    exito: boolean;
    totalProcesados: number;
    errores: ErrorMigracion[];
}

/**
 * Corrige errores comunes de sintaxis JSON generados durante procesos de extracción.
 */
const repararEstructuraJSON = (jsonString: string): any => {
    try {
        return JSON.parse(jsonString);
    } catch (primerError) {
        try {
            const reparado = jsonString
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r")
                .replace(/:\s*([a-zA-ZÁÉÍÓÚáéíóúÑñ][^,}\]"]*)/g, (_, valorCapturado) => {
                    const valor = valorCapturado.trim();
                    if (/^(true|false|null)$/i.test(valor)) {
                        return `: ${valor}`;
                    }
                    return `: "${valor}"`;
                });

            return JSON.parse(reparado);
        } catch {
            throw primerError;
        }
    }
};

/**
 * Genera y descarga un archivo JSON con los registros que presentaron anomalías de formato.
 */
const exportarReporteIncidencias = (errores: ErrorMigracion[]): void => {
    if (typeof window === "undefined" || errores.length === 0) return;

    const contenido = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(errores, null, 2));
    const elementoDescarga = document.createElement("a");
    elementoDescarga.setAttribute("href", contenido);
    elementoDescarga.setAttribute("download", `auditoria_migracion_${Date.now()}.json`);
    document.body.appendChild(elementoDescarga);
    elementoDescarga.click();
    elementoDescarga.remove();
};

/**
 * Elimina la propiedad obsoleta 'opiniones' embebida en los documentos de destinos turísticos.
 */
export const limpiarCampoOpinionesOriginales = async (): Promise<number> => {
    try {
        const snapshotLugares = await getDocs(collection(db, "lugares_turisticos_scrapped"));
        let contadorModificados = 0;

        for (const docLugar of snapshotLugares.docs) {
            const data = docLugar.data();

            if ("opiniones" in data) {
                const lugarRef = doc(db, "lugares_turisticos_scrapped", docLugar.id);
                await updateDoc(lugarRef, {
                    opiniones: deleteField()
                });
                contadorModificados++;
            }
        }

        return contadorModificados;
    } catch (error) {
        throw new Error("Fallo en la depuración de campos obsoletos en Firestore.");
    }
};

/**
 * Migra las opiniones desde cadenas JSON incrustadas hacia la colección independiente 'opiniones_lugares'.
 */
export const migrarOpinionesAColeccion = async (): Promise<ResultadoProceso> => {
    const lugaresConError: ErrorMigracion[] = [];
    let contadorMigrados = 0;

    try {
        const snapshotLugares = await getDocs(collection(db, "lugares_turisticos_scrapped"));

        for (const docLugar of snapshotLugares.docs) {
            const lugarData = docLugar.data();
            const lugarId = docLugar.id;
            const nombreLugar = lugarData.nombre || "Sin Nombre";

            if (lugarData.opiniones && typeof lugarData.opiniones === "string") {
                try {
                    const opinionesArray = repararEstructuraJSON(lugarData.opiniones);

                    if (Array.isArray(opinionesArray)) {
                        for (const opinion of opinionesArray) {
                            const opinionesRef = collection(db, "opiniones_lugares");
                            const consultaExistencia = query(
                                opinionesRef,
                                where("lugarId", "==", lugarId),
                                where("usuarioId", "==", opinion.usuarioId)
                            );

                            const snapshotExistente = await getDocs(consultaExistencia);

                            if (snapshotExistente.empty) {
                                const nuevaOpinion: OpinionFirebase = {
                                    lugarId,
                                    usuarioId: opinion.usuarioId || "anonimo",
                                    usuario: opinion.usuario || "Usuario",
                                    comentario: opinion.comentario || "",
                                    puntuacion: Number(opinion.puntuacion) || 5,
                                    fuente: opinion.fuente || "migracion",
                                    fecha: opinion.fecha || new Date().toLocaleDateString("es-CO"),
                                    createdAt: Date.now()
                                };

                                await addDoc(opinionesRef, nuevaOpinion);
                                contadorMigrados++;
                            }
                        }
                    }
                } catch (parseError: any) {
                    lugaresConError.push({
                        id: lugarId,
                        nombre: nombreLugar,
                        error: parseError.message || "Error al deserializar estructura JSON",
                        opinionesOriginal: lugarData.opiniones
                    });
                }
            }
        }

        if (lugaresConError.length > 0) {
            exportarReporteIncidencias(lugaresConError);
        }

        return {
            exito: true,
            totalProcesados: contadorMigrados,
            errores: lugaresConError
        };

    } catch (error) {
        return {
            exito: false,
            totalProcesados: contadorMigrados,
            errores: lugaresConError
        };
    }
};