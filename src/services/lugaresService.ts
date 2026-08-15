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

// 🚀 MEJORA 1: Obtener lugares del catálogo de forma ligera (sin descargar la BD completa de opiniones)
export const obtenerLugares = async (): Promise<LugarTuristico[]> => {
  console.log("Obteniendo lugares del catálogo...");

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
        opiniones: [] as Opinion[], // Se leen individualmente al abrir el detalle del lugar
        puntuacion: data.puntuacion || 0
      } as LugarTuristico;
    });
  } catch (error) {
    console.error("Error obteniendo lugares:", error);
    return [];
  }
};

// 🤖 MEJORA 2: Función dedicada para la IA (carga masiva de opiniones solo cuando se consulte la IA)
export const obtenerContextoParaIA = async (): Promise<LugarTuristico[]> => {
  try {
    const [snapshotLugares, snapshotOpiniones] = await Promise.all([
      getDocs(query(collection(db, 'lugares_turisticos_scrapped'), where('confirmado', '==', true))),
      getDocs(collection(db, 'opiniones_lugares'))
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
        puntuacion: puntuacionCalculada
      } as LugarTuristico;
    });
  } catch (error) {
    console.error("Error obteniendo contexto para la IA:", error);
    return [];
  }
};

// 🛠️ MEJORA 3: Migrador para asignar 'confirmado: true' a registros antiguos que no tengan el campo
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
    console.error("Error durante la migración de documentos:", error);
    throw error;
  }
};

export const obtenerImagenesPorDestino = async (idDestino: string): Promise<string[]> => {
  try {
    console.log("obteniendo imagenes");
    const q = query(
        collection(db, "imagenes_b64"),
        where("idVinculado", "==", idDestino)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data().base64 as string);
  } catch (error) {
    console.error("Error obteniendo imágenes:", error);
    return [];
  }
};

export const obtenerFavoritosPorUsuario = async (usuarioId: string): Promise<LugarTuristico[]> => {
  try {
    const q = query(
        collection(db, "favoritos"),
        where("usuarioId", "==", usuarioId)
    );
    const snapshot = await getDocs(q);
    const favDocs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() as { lugarId: string; fecha: number } }));

    favDocs.sort((a, b) => (b.fecha || 0) - (a.fecha || 0));

    const lugaresPromises = favDocs.map(fav => obtenerLugarPorId(fav.lugarId));
    const lugares = await Promise.all(lugaresPromises);

    return lugares.filter((l): l is LugarTuristico => l !== null);
  } catch (error) {
    console.error("Error al obtener favoritos del usuario:", error);
    return [];
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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LugarTuristico[];
  } catch (error) {
    console.error("Error al obtener mis destinos:", error);
    return [];
  }
};

export const obtenerLugarPorId = async (id: string): Promise<LugarTuristico | null> => {
  try {
    const lugarRef = doc(db, 'lugares_turisticos_scrapped', id);
    const lugarSnap = await getDoc(lugarRef);

    if (!lugarSnap.exists()) {
      console.warn("No se encontró el lugar con ID:", id);
      return null;
    }

    const lugarData = lugarSnap.data();

    const [snapshotImagenes, snapshotOpiniones] = await Promise.all([
      getDocs(query(collection(db, "imagenes_b64"), where("idVinculado", "==", id))),
      getDocs(query(collection(db, "opiniones_lugares"), where("lugarId", "==", id)))
    ]);

    const imagenes = snapshotImagenes.docs.map(doc => doc.data().base64 as string);
    const opiniones = snapshotOpiniones.docs.map(doc => doc.data() as Opinion);

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

  } catch (error) {
    console.error("Error al obtener detalle del lugar:", error);
    return null;
  }
};

const comprimirImagen = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');

        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.4));
      };
    };
  });
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

    const promesasImagenes = archivos
        .filter(f => f !== null)
        .map(async (file) => {
          const b64Comprimido = await comprimirImagen(file);
          return addDoc(collection(db, "imagenes_b64"), {
            idVinculado: idDestino,
            esLugar: true,
            base64: b64Comprimido,
            fechaCreacion: Date.now()
          });
        });

    await Promise.all(promesasImagenes);
    return idDestino;

  } catch (error) {
    console.error("Error guardando destino en Firestore:", error);
    throw error;
  }
};

export const agregarOpinionLugar = async (
    lugarId: string,
    nuevaOpinion: Opinion
): Promise<boolean> => {
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
    await updateDoc(lugarRef, {
      puntuacion: nuevaPuntuacionMedia
    });

    return true;
  } catch (error) {
    console.error("Error guardando la opinión en BD:", error);
    return false;
  }
};

export const obtenerDestinosPendientes = async (): Promise<LugarTuristico[]> => {
  try {
    const q = query(
        collection(db, "lugares_turisticos_scrapped"),
        where("confirmado", "==", false)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LugarTuristico[];
  } catch (error) {
    console.error("Error obteniendo destinos pendientes:", error);
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

export const reportarLugar = async (
    lugarId: string,
    usuarioId: string,
    motivo: string
): Promise<boolean> => {
  try {
    await addDoc(collection(db, "reportes"), {
      lugarId: lugarId,
      usuarioId: usuarioId,
      motivo: motivo,
      fecha: Date.now(),
      estado: "pendiente"
    });
    return true;
  } catch (error) {
    console.error("Error al registrar el reporte:", error);
    return false;
  }
};

export const obtenerLugaresConReportesPendientes = async (umbral: number = 20) => {
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

    const lugaresSuperanUmbral = Object.entries(reportesPorLugar).filter(
        ([_, reportes]) => reportes.length >= umbral
    );

    const resultados = [];

    for (const [lugarId, reportes] of lugaresSuperanUmbral) {
      const lugarSnap = await getDoc(doc(db, "lugares_turisticos_scrapped", lugarId));
      if (lugarSnap.exists()) {
        resultados.push({
          lugar: { id: lugarId, ...lugarSnap.data() },
          reportes: reportes
        });
      }
    }

    return resultados;
  } catch (error) {
    console.error("Error obteniendo reportes agrupados:", error);
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
  } catch (error) {
    console.error("Error al desestimar reportes:", error);
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
  } catch (error) {
    console.error("Error al poner lugar en revisión:", error);
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

      const reportes = repSnap.docs.map(r => ({ id: r.id, ...r.data() }));

      resultados.push({
        lugar: { id: lugarId, ...lugarData },
        reportes: reportes
      });
    }

    return resultados;
  } catch (error) {
    console.error("Error obteniendo lugares en revision:", error);
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
  } catch (error) {
    console.error("Error al dar de baja el lugar:", error);
    return false;
  }
};

export const eliminarDestino = async (destinoId: string, usuarioId: string): Promise<boolean> => {
  try {
    if (!destinoId) return false;

    const docRef = doc(db, "lugares_turisticos_scrapped", destinoId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error("El destino no existe o ya fue eliminado.");
      return false;
    }

    const datosOriginales = docSnap.data();

    const auditRef = doc(db, "destinos_eliminados_auditoria", destinoId);
    await setDoc(auditRef, {
      ...datosOriginales,
      idOriginal: destinoId,
      fechaEliminacion: Date.now(),
      eliminadoPor: usuarioId
    });

    await deleteDoc(docRef);

    console.log(`✅ Destino ${destinoId} movido a auditoría y borrado del catálogo público.`);
    return true;
  } catch (error) {
    console.error("Error al eliminar el destino:", error);
    return false;
  }
};