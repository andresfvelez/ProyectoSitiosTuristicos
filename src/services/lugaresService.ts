import {collection, getDocs, addDoc, query, where, doc, getDoc, updateDoc, deleteDoc, setDoc} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import {LugarTuristico, Opinion} from '../Components/models/LugarTuristico';


export const obtenerLugares = async (): Promise<LugarTuristico[]> => {
  console.log("Obteniendo lugares y opiniones...");

  try {
    // PeticionesFirestore
    const [snapshotLugares, snapshotOpiniones] = await Promise.all([
      getDocs(collection(db, 'lugares_turisticos_scrapped')),
      getDocs(collection(db, 'opiniones_lugares'))
    ]);

    // Mapeo de  las opiniones por el id del lugar para asociarlas rápido
    const opinionesPorLugar: Record<string, Opinion[]> = {};

    snapshotOpiniones.docs.forEach(doc => {
      const data = doc.data() as Opinion;
      if (!opinionesPorLugar[data.lugarId]) {
        opinionesPorLugar[data.lugarId] = [];
      }
      opinionesPorLugar[data.lugarId].push(data);
    });


    const todosLosLugares = snapshotLugares.docs.map(doc => {
      const data = doc.data();
      const lugarId = doc.id;

      const opiniones = opinionesPorLugar[lugarId] || [];

      // Cálculo del promedio dinámico
      let puntuacionCalculada = data.puntuacion || 0;
      if (opiniones.length > 0) {
        const suma = opiniones.reduce((acc, op) => acc + (op.puntuacion || 0), 0);
        puntuacionCalculada = Number((suma / opiniones.length).toFixed(1));
      }

      return {
        id: lugarId,
        ...data,
        opiniones: opiniones,             // 👈 Array de objetos Opinion[]
        puntuacion: puntuacionCalculada   // 👈 Promedio actualizado
      } as LugarTuristico;
    });
    return todosLosLugares.filter(lugar => lugar.confirmado !== false);
  } catch (error) {
    console.error("Error obteniendo lugares:", error);
    return [];
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
    // Retornamos solo el string base64 de cada documento encontrado
    return querySnapshot.docs.map(doc => doc.data().base64 as string);
  } catch (error) {
    console.error("Error obteniendo imágenes:", error);
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
    // 1. Obtener el documento del lugar
    const lugarRef = doc(db, 'lugares_turisticos_scrapped', id);
    const lugarSnap = await getDoc(lugarRef);

    if (!lugarSnap.exists()) {
      console.warn("No se encontró el lugar con ID:", id);
      return null;
    }

    const lugarData = lugarSnap.data();

    // 2. Traer fotos y opiniones en paralelo
    const [snapshotImagenes, snapshotOpiniones] = await Promise.all([
      getDocs(query(collection(db, "imagenes_b64"), where("idVinculado", "==", id))),
      getDocs(query(collection(db, "opiniones_lugares"), where("lugarId", "==", id)))
    ]);

    const imagenes = snapshotImagenes.docs.map(doc => doc.data().base64 as string);
    const opiniones = snapshotOpiniones.docs.map(doc => doc.data() as Opinion);

    // 3. Calcular la puntuación promedio dinámicamente
    let puntuacionCalculada = lugarData.puntuacion || 0;
    if (opiniones.length > 0) {
      const suma = opiniones.reduce((acc, op) => acc + (op.puntuacion || 0), 0);
      puntuacionCalculada = Number((suma / opiniones.length).toFixed(1));
    }

    // Retorna la estructura garantizando la interfaz unificada LugarTuristico
    return {
      id: lugarSnap.id,
      ...lugarData, // 👈 Trae automáticamente rnt, tagsEspeciales, petFriendly, etc.
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

        // LIMITAMOS A 800px (suficiente para una card de catálogo)
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

        // CALIDAD 0.4 (40%) - Esto garantiza que pese muy poco
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
    // Estructuramos el objeto basándonos directamente en la interfaz LugarTuristico
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

      // CAMPOS DE CALIDAD Y ATRIBUTOS
      rnt: datos.rnt || "",
      unescoId: datos.unescoId || "",
      // Mantiene el arreglo de etiquetas dinámicas (actividades, comodidades o cocina)
      tagsEspeciales: datos.tagsEspeciales || [],
      servicios: datos.servicios || [],
      petFriendly: Boolean(datos.petFriendly),
      accesibleSillaRuedas: Boolean(datos.accesibleSillaRuedas),
      dificultad: datos.dificultad || "Baja",
      contactoWhatsapp: datos.contactoWhatsapp || "",
      queLlevar: datos.queLlevar || "",

      // CRITERIOS DE FILTRADO Y BÚSQUEDAS
      categoriaPrincipal: datos.categoria || "Cultura",
      perfilUsuario: datos.perfilUsuario || ["Pareja", "Amigos"],
      nivelGasto: Number(datos.nivelGasto) || 2,
      clima: datos.clima || "Templado",
      popularidad: datos.popularidad ?? false,
      estanciaSugerida: datos.estanciaSugerida || "Fin de semana",
      entorno: datos.entorno || "Rural",
      acceso: datos.acceso || "Vehículo simple"
    };

    // 1. Guardar documento principal en Firestore
    const destinoDoc = await addDoc(collection(db, "lugares_turisticos_scrapped"), nuevoLugar);
    const idDestino = destinoDoc.id;

    // 2. Convertir y guardar cada imagen vinculada en Base64
    const promesasImagenes = archivos
        .filter(f => f !== null)
        .map(async (file) => {
          const b64Comprimido = await comprimirImagen(file); // Tu función helper existente
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
    // 1. Guardar la nueva opinión en la colección separada 'opiniones_lugares'
    await addDoc(collection(db, "opiniones_lugares"), {
      ...nuevaOpinion,
      lugarId: lugarId, // Blindamos que siempre tenga la llave foránea
      createdAt: Date.now() // Útil por si a futuro quieres ordenar por más recientes
    });

    // 2. Traer TODAS las opiniones de este lugar para calcular el promedio real total
    const q = query(collection(db, "opiniones_lugares"), where("lugarId", "==", lugarId));
    const snapshotOpiniones = await getDocs(q);

    const todasLasOpiniones: Opinion[] = [];
    snapshotOpiniones.forEach((docSnap) => {
      todasLasOpiniones.push(docSnap.data() as Opinion);
    });

    // 3. Recalcular el promedio exacto
    let nuevaPuntuacionMedia = 0;
    if (todasLasOpiniones.length > 0) {
      const suma = todasLasOpiniones.reduce((acc, op) => acc + Number(op.puntuacion || 0), 0);
      nuevaPuntuacionMedia = Number((suma / todasLasOpiniones.length).toFixed(1));
    }

    // 4. Actualizar SOLAMENTE la puntuación en el documento principal del lugar
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

// aprobar publicacion
export const confirmarDestino = async (id: string): Promise<void> => {
  const lugarRef = doc(db, "lugares_turisticos_scrapped", id);
  await updateDoc(lugarRef, { confirmado: true });
};

//rechazar publicacion
export const rechazarDestino = async (id: string): Promise<void> => {
  const lugarRef = doc(db, "lugares_turisticos_scrapped", id);
  await deleteDoc(lugarRef);
};

// Editar publicacion (Edición por Creador o Admin)
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
//Eliminar publicacion(usuario creador o admin)
export const eliminarDestino = async (destinoId: string, usuarioId: string): Promise<boolean> => {
  try {
    if (!destinoId) return false;

    //Consulta el documento original antes de eliminarlo
    const docRef = doc(db, "lugares_turisticos_scrapped", destinoId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error("El destino no existe o ya fue eliminado.");
      return false;
    }

    const datosOriginales = docSnap.data();

    // Guardar copia de respaldo en 'destinos_eliminados_auditoria' para temas de auditoria
    const auditRef = doc(db, "destinos_eliminados_auditoria", destinoId);
    await setDoc(auditRef, {
      ...datosOriginales,
      idOriginal: destinoId,
      fechaEliminacion: Date.now(),
      eliminadoPor: usuarioId
    });

    //Borrar únicamente el registro de la tabla principal
    await deleteDoc(docRef);

    console.log(`✅ Destino ${destinoId} movido a auditoría y borrado del catálogo público.`);
    return true;
  } catch (error) {
    console.error("Error al eliminar el destino:", error);
    return false;
  }
};
