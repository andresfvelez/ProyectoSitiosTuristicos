import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { LugarTuristico, Opinion } from '../Components/models/LugarTuristico';

/* ==========================================================================
   1. UTILIDADES Y PROCESAMIENTO
   ========================================================================== */

/**
 * Algoritmo de compresión liviano mediante Canvas para evitar bloqueos de RAM.
 * Reduce las dimensiones y la calidad de la imagen antes de subirla.
 */
export const comprimirImagen = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX_SIZE = 1000;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round(height * (MAX_SIZE / width));
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round(width * (MAX_SIZE / height));
          height = MAX_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("No se pudo obtener el contexto Canvas"));

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.45));
    };

    img.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };

    img.src = objectUrl;
  });
};

/* ==========================================================================
   2. GESTIÓN CENTRAL DE DESTINOS (CRUD)
   ========================================================================== */

export const obtenerLugares = async (): Promise<LugarTuristico[]> => {
  try {
    const q = query(
        collection(db, 'lugares_turisticos_scrapped'),
        where('confirmado', '==', true)
    );
    const snapshotLugares = await getDocs(q);

    return snapshotLugares.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        opiniones: [] as Opinion[],
        puntuacion: data.puntuacion || 0
      } as LugarTuristico;
    });
  } catch {
    return [];
  }
};

export const obtenerLugarPorId = async (id: string): Promise<LugarTuristico | null> => {
  try {
    const lugarRef = doc(db, 'lugares_turisticos_scrapped', id);
    const lugarSnap = await getDoc(lugarRef);

    if (!lugarSnap.exists()) return null;

    const lugarData = lugarSnap.data();

    const [snapshotImagenes, snapshotOpiniones] = await Promise.all([
      getDocs(query(collection(db, "imagenes_b64"), where("idVinculado", "==", id))),
      getDocs(query(collection(db, "opiniones_lugares"), where("lugarId", "==", id)))
    ]);

    const imagenes = snapshotImagenes.docs.map(d => d.data().base64 as string);
    const opiniones = snapshotOpiniones.docs.map(d => d.data() as Opinion);

    let puntuacionCalculada = lugarData.puntuacion || 0;
    if (opiniones.length > 0) {
      const suma = opiniones.reduce((acc, op) => acc + (op.puntuacion || 0), 0);
      puntuacionCalculada = Number((suma / opiniones.length).toFixed(1));
    }

    return {
      id: lugarSnap.id,
      ...lugarData,
      imagenes,
      opiniones,
      puntuacion: puntuacionCalculada
    } as LugarTuristico;
  } catch {
    return null;
  }
};

export const obtenerLugaresPorUsuario = async (usuarioId: string): Promise<LugarTuristico[]> => {
  try {
    if (!usuarioId) return [];
    const q = query(
        collection(db, "lugares_turisticos_scrapped"),
        where("creadorId", "==", usuarioId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as LugarTuristico[];
  } catch {
    return [];
  }
};

export const guardarDestino = async (
    datos: LugarTuristico,
    archivos: File[],
    ubicacion: { lat: number; lng: number },
    usuarioId: string
): Promise<string> => {
  try {
    const nuevoLugar: Omit<LugarTuristico, 'id'> = {
      nombre: datos.nombre || "",
      descripcion: datos.descripcion || "",
      categoria: datos.categoria || "aventura",
      latitud: ubicacion.lat,
      longitud: ubicacion.lng,
      confirmado: false,
      creadorId: usuarioId,
      ciudad: datos.ciudad || "",
      departamento: datos.departamento || "",
      puntuacion: Number(datos.puntuacion) || 0,
      pais: datos.pais || "Colombia",
      minimo: Number(datos.minimo) || 0,
      recomendado: Number(datos.recomendado) || Number(datos.minimo) || 0,
      fechaRegistro: Date.now(),
      imagenes: [],
      rnt: datos.rnt || "",
      unescoId: datos.unescoId || "",
      tagsEspeciales: datos.tagsEspeciales || [],
      servicios: datos.servicios || [],
      petFriendly: Boolean(datos.petFriendly),
      accesibleSillaRuedas: Boolean(datos.accesibleSillaRuedas),
      dificultad: datos.dificultad || "Baja",
      contactoWhatsapp: datos.contactoWhatsapp || "",
      queLlevar: datos.queLlevar || "",
      categoriaPrincipal: datos.categoria || "Cultura",
      perfilUsuario: datos.perfilUsuario || ["Pareja", "Amigos"],
      nivelGasto: Number(datos.nivelGasto) || 2,
      clima: datos.clima || "Templado",
      popularidad: datos.popularidad ?? false,
      estanciaSugerida: datos.estanciaSugerida || "Fin de semana",
      entorno: datos.entorno || "Rural",
      acceso: datos.acceso || "Vehículo simple"
    };

    const destinoDoc = await addDoc(collection(db, "lugares_turisticos_scrapped"), nuevoLugar);
    const idDestino = destinoDoc.id;

    if (archivos && archivos.length > 0) {
      await guardarImagenesDestino(idDestino, archivos);
    }

    return idDestino;
  } catch (error) {
    throw error;
  }
};

export const actualizarDestino = async (
    id: string,
    datosActualizados: Partial<LugarTuristico>
): Promise<void> => {
  const lugarRef = doc(db, "lugares_turisticos_scrapped", id);
  await updateDoc(lugarRef, {
    ...datosActualizados,
    fechaActualizacion: Date.now()
  });
};

export const eliminarDestino = async (destinoId: string, usuarioId: string): Promise<boolean> => {
  try {
    if (!destinoId) return false;

    const docRef = doc(db, "lugares_turisticos_scrapped", destinoId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return false;

    const datosOriginales = docSnap.data();
    const auditRef = doc(db, "destinos_eliminados_auditoria", destinoId);

    await setDoc(auditRef, {
      ...datosOriginales,
      idOriginal: destinoId,
      fechaEliminacion: Date.now(),
      eliminadoPor: usuarioId
    });

    await deleteDoc(docRef);
    return true;
  } catch {
    return false;
  }
};

/* ==========================================================================
   3. GESTIÓN DE IMÁGENES
   ========================================================================== */

export const obtenerImagenesPorDestino = async (idDestino: string): Promise<string[]> => {
  try {
    const q = query(
        collection(db, "imagenes_b64"),
        where("idVinculado", "==", idDestino)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => d.data().base64 as string);
  } catch {
    return [];
  }
};

export const guardarImagenesDestino = async (idDestino: string, archivos: File[]): Promise<void> => {
  if (!archivos || archivos.length === 0) return;

  const promesas = archivos.filter(Boolean).map(async (file) => {
    const b64 = await comprimirImagen(file);
    return addDoc(collection(db, "imagenes_b64"), {
      idVinculado: idDestino,
      esLugar: true,
      base64: b64,
      fechaCreacion: Date.now()
    });
  });

  await Promise.all(promesas);
};

export const eliminarImagenesDestino = async (idDestino: string, base64sAEliminar: string[]): Promise<void> => {
  if (!base64sAEliminar || base64sAEliminar.length === 0) return;

  try {
    const q = query(
        collection(db, "imagenes_b64"),
        where("idVinculado", "==", idDestino)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let eliminados = 0;

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (base64sAEliminar.includes(data.base64)) {
        batch.delete(docSnap.ref);
        eliminados++;
      }
    });

    if (eliminados > 0) {
      await batch.commit();
    }
  } catch {
    // Fallo silencioso de eliminación local
  }
};

/* ==========================================================================
   4. INTERACCIONES SOCIALES (FAVORITOS Y OPINIONES)
   ========================================================================== */

export const obtenerFavoritosPorUsuario = async (usuarioId: string): Promise<LugarTuristico[]> => {
  try {
    const q = query(
        collection(db, "favoritos"),
        where("usuarioId", "==", usuarioId)
    );
    const snapshot = await getDocs(q);
    const favDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() as { lugarId: string; fecha: number } }));

    favDocs.sort((a, b) => (b.fecha || 0) - (a.fecha || 0));

    const lugaresPromises = favDocs.map(fav => obtenerLugarPorId(fav.lugarId));
    const lugares = await Promise.all(lugaresPromises);

    return lugares.filter((l): l is LugarTuristico => l !== null);
  } catch {
    return [];
  }
};

export const agregarOpinionLugar = async (lugarId: string, nuevaOpinion: Opinion): Promise<boolean> => {
  try {
    await addDoc(collection(db, "opiniones_lugares"), {
      ...nuevaOpinion,
      lugarId: lugarId,
      createdAt: Date.now()
    });

    const q = query(collection(db, "opiniones_lugares"), where("lugarId", "==", lugarId));
    const snapshotOpiniones = await getDocs(q);

    const todasLasOpiniones: Opinion[] = [];
    snapshotOpiniones.forEach((docSnap) => {
      todasLasOpiniones.push(docSnap.data() as Opinion);
    });

    let nuevaPuntuacionMedia = 0;
    if (todasLasOpiniones.length > 0) {
      const suma = todasLasOpiniones.reduce((acc, op) => acc + Number(op.puntuacion || 0), 0);
      nuevaPuntuacionMedia = Number((suma / todasLasOpiniones.length).toFixed(1));
    }

    const lugarRef = doc(db, "lugares_turisticos_scrapped", lugarId);
    await updateDoc(lugarRef, { puntuacion: nuevaPuntuacionMedia });

    return true;
  } catch {
    return false;
  }
};

export const recalcularPuntuacionesGenerales = async (): Promise<boolean> => {
  try {
    const [snapLugares, snapOpiniones] = await Promise.all([
      getDocs(collection(db, "lugares_turisticos_scrapped")),
      getDocs(collection(db, "opiniones_lugares"))
    ]);

    const puntuacionesPorLugar: Record<string, number[]> = {};

    snapOpiniones.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const puntuacionNum = Number(data.puntuacion);

      if (data.lugarId && !isNaN(puntuacionNum)) {
        if (!puntuacionesPorLugar[data.lugarId]) {
          puntuacionesPorLugar[data.lugarId] = [];
        }
        puntuacionesPorLugar[data.lugarId].push(puntuacionNum);
      }
    });

    const batch = writeBatch(db);

    snapLugares.docs.forEach((docSnap) => {
      const lugarId = docSnap.id;
      const listaPuntos = puntuacionesPorLugar[lugarId] || [];
      let nuevaPuntuacionMedia = 0;

      if (listaPuntos.length > 0) {
        const suma = listaPuntos.reduce((acc, p) => acc + p, 0);
        nuevaPuntuacionMedia = Number((suma / listaPuntos.length).toFixed(1));
      }

      const lugarRef = doc(db, "lugares_turisticos_scrapped", lugarId);
      batch.update(lugarRef, { puntuacion: nuevaPuntuacionMedia });
    });

    await batch.commit();
    return true;
  } catch {
    return false;
  }
};

/* ==========================================================================
   5. MODERACIÓN Y REPORTES ADMINISTRATIVOS
   ========================================================================== */

export const obtenerDestinosPendientes = async (): Promise<LugarTuristico[]> => {
  try {
    const q = query(
        collection(db, "lugares_turisticos_scrapped"),
        where("confirmado", "==", false)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as LugarTuristico[];
  } catch {
    return [];
  }
};

export const confirmarDestino = async (id: string): Promise<void> => {
  const lugarRef = doc(db, "lugares_turisticos_scrapped", id);
  await updateDoc(lugarRef, { confirmado: true });
};

export const rechazarDestino = async (id: string): Promise<void> => {
  const lugarRef = doc(db, "lugares_turisticos_scrapped", id);
  await deleteDoc(lugarRef);
};

export const reportarLugar = async (lugarId: string, usuarioId: string, motivo: string): Promise<boolean> => {
  try {
    await addDoc(collection(db, "reportes"), {
      lugarId: lugarId,
      usuarioId: usuarioId,
      motivo: motivo,
      fecha: Date.now(),
      estado: "pendiente"
    });
    return true;
  } catch {
    return false;
  }
};

export const obtenerLugaresConReportesPendientes = async () => {
  try {
    const q = query(collection(db, "reportes"), where("estado", "==", "pendiente"));
    const snapshot = await getDocs(q);

    const reportesPorLugar: Record<string, any[]> = {};

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const lugarId = data.lugarId;

      if (lugarId) {
        if (!reportesPorLugar[lugarId]) {
          reportesPorLugar[lugarId] = [];
        }
        reportesPorLugar[lugarId].push({ id: docSnap.id, ...data });
      }
    });

    const umbral = await obtenerLimiteReportes();
    const lugaresSuperanUmbral = Object.entries(reportesPorLugar).filter(
        ([_, reportes]) => reportes.length >= umbral
    );

    const resultados = [];

    for (const [lugarId, reportes] of lugaresSuperanUmbral) {
      const lugarSnap = await getDoc(doc(db, "lugares_turisticos_scrapped", lugarId));
      if (lugarSnap.exists()) {
        const reportesConNombre = await Promise.all(
            reportes.map(async (repo) => {
              let nombreCalculado = repo.usuarioId;
              if (repo.usuarioId) {
                const userSnap = await getDoc(doc(db, "usuarios", repo.usuarioId));
                if (userSnap.exists()) {
                  const uData = userSnap.data();
                  nombreCalculado = uData.fullName || uData.displayName || uData.email || repo.usuarioId;
                }
              }
              return { ...repo, usuarioNombre: nombreCalculado };
            })
        );
        resultados.push({
          lugar: { id: lugarId, ...lugarSnap.data() },
          reportes: reportesConNombre
        });
      }
    }
    return resultados;
  } catch {
    return [];
  }
};

export const desestimarReportesLugar = async (lugarId: string) => {
  try {
    const batch = writeBatch(db);
    const lugarRef = doc(db, "lugares_turisticos_scrapped", lugarId);
    batch.update(lugarRef, { confirmado: true });

    const q = query(collection(db, "reportes"), where("lugarId", "==", lugarId));
    const snapshot = await getDocs(q);

    snapshot.docs.forEach((d) => {
      batch.update(d.ref, { estado: "desestimado" });
    });

    await batch.commit();
    return true;
  } catch {
    return false;
  }
};

export const ponerLugarEnRevision = async (lugarId: string) => {
  try {
    const batch = writeBatch(db);
    const lugarRef = doc(db, "lugares_turisticos_scrapped", lugarId);
    batch.update(lugarRef, { confirmado: "revision" });

    const q = query(collection(db, "reportes"), where("lugarId", "==", lugarId), where("estado", "==", "pendiente"));
    const snapshot = await getDocs(q);

    snapshot.docs.forEach((d) => {
      batch.update(d.ref, { estado: "revision" });
    });

    await batch.commit();
    return true;
  } catch {
    return false;
  }
};

export const obtenerLugaresEnRevision = async () => {
  try {
    const q = query(collection(db, "lugares_turisticos_scrapped"), where("confirmado", "==", "revision"));
    const snapshot = await getDocs(q);
    const resultados = [];

    for (const docSnap of snapshot.docs) {
      const lugarId = docSnap.id;
      const lugarData = docSnap.data();

      const qRep = query(collection(db, "reportes"), where("lugarId", "==", lugarId));
      const repSnap = await getDocs(qRep);

      const reportesRaw = repSnap.docs.map(r => ({ id: r.id, ...(r.data() as any) }));
      const reportesConNombre = await Promise.all(
          reportesRaw.map(async (repo) => {
            let nombreCalculado = repo.usuarioId || "Usuario Desconocido";
            if (repo.usuarioId) {
              const userSnap = await getDoc(doc(db, "usuarios", repo.usuarioId));
              if (userSnap.exists()) {
                const uData = userSnap.data() as any;
                nombreCalculado = uData.fullName || uData.displayName || uData.email || repo.usuarioId;
              }
            }
            return { ...repo, usuarioNombre: nombreCalculado };
          })
      );
      resultados.push({
        lugar: { id: lugarId, ...lugarData },
        reportes: reportesConNombre
      });
    }
    return resultados;
  } catch {
    return [];
  }
};

export const darDeBajaLugar = async (lugarId: string) => {
  try {
    const batch = writeBatch(db);
    const lugarRef = doc(db, "lugares_turisticos_scrapped", lugarId);
    batch.update(lugarRef, { confirmado: "dado de baja" });

    const q = query(collection(db, "reportes"), where("lugarId", "==", lugarId));
    const snapshot = await getDocs(q);

    snapshot.docs.forEach((d) => {
      batch.update(d.ref, { estado: "atendido" });
    });

    await batch.commit();
    return true;
  } catch {
    return false;
  }
};

export const obtenerLimiteReportes = async (): Promise<number> => {
  try {
    const docRef = doc(db, "Constantes", "reportes");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().cantidadMinima ?? 3;
    }
    return 3;
  } catch {
    return 3;
  }
};

export const guardarLimiteReportes = async (cantidadMinima: number): Promise<boolean> => {
  try {
    const docRef = doc(db, "Constantes", "reportes");
    await setDoc(docRef, { cantidadMinima }, { merge: true });
    return true;
  } catch {
    return false;
  }
};

/* ==========================================================================
   6. MIGRACIONES ADMINISTRATIVAS
   ========================================================================== */

export const migrarDocumentosViejos = async (): Promise<number> => {
  try {
    const snapshot = await getDocs(collection(db, 'lugares_turisticos_scrapped'));
    const batch = writeBatch(db);
    let contador = 0;

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.confirmado === undefined || data.confirmado === null) {
        batch.update(docSnap.ref, { confirmado: true });
        contador++;
      }
    });

    if (contador > 0) {
      await batch.commit();
    }

    return contador;
  } catch (error) {
    throw error;
  }
};