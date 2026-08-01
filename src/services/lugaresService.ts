import {collection, getDocs, addDoc, query, where, doc, getDoc} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import {LugarTuristico, Opinion} from '../Components/models/LugarTuristico';


export const obtenerLugares = async (): Promise<LugarTuristico[]> => {
  console.log("Obteniendo lugares y opiniones...");

  try {
    // 1. Peticiones simultáneas a Firestore
    const [snapshotLugares, snapshotOpiniones] = await Promise.all([
      getDocs(collection(db, 'lugares_turisticos_scrapped')),
      getDocs(collection(db, 'opiniones_lugares'))
    ]);

    // 2. Mapeamos las opiniones por el id del lugar para asociarlas rápido
    const opinionesPorLugar: Record<string, Opinion[]> = {};

    snapshotOpiniones.docs.forEach(doc => {
      const data = doc.data() as Opinion;
      if (!opinionesPorLugar[data.lugarId]) {
        opinionesPorLugar[data.lugarId] = [];
      }
      opinionesPorLugar[data.lugarId].push(data);
    });

    // 3. Mapeamos los lugares con su array de opiniones y puntuación calculada
    return snapshotLugares.docs.map(doc => {
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

    // 2. Traer fotos y opiniones de este lugar específico en paralelo
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

    return {
      id: lugarSnap.id,
      ...lugarData,
      imagenes,
      opiniones, // 👈 Ya entra directamente como Opinion[]
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

export const guardarDestino = async (datos: any, archivos: File[], ubicacion: {lat: number, lng: number}) => {
  try {
    // 1. Guardar primero el destino para obtener su ID
    const nuevoLugar: any = {
      nombre: datos.nombre || "",
      descripcion: datos.descripcion || "",
      categoria: datos.categoria || "Atractivo Turístico",
      latitud: ubicacion.lat,
      longitud: ubicacion.lng,
      ciudad: datos.ciudad || "",
      departamento: datos.departamento || "",
      puntuacion: Number(datos.puntuacion) || 0,
      opiniones: datos.opiniones || "[]",
      pais: datos.pais || "Colombia",
      minimo: datos.minimo || 0,
      recomendado: datos.recomendado || 0,
      fechaRegistro: Date.now(),
      imagenes: [], // Se llenará después de subir los archivos

      // --- LOS 9 CRITERIOS CLAVE PARA EL FILTRADO ---
      categoriaPrincipal: datos.categoriaPrincipal || "Cultura",
      perfilUsuario: datos.perfilUsuario || ["Pareja", "Amigos"], // Array
      nivelGasto: Number(datos.nivelGasto) || 2, // 1, 2 o 3
      clima: datos.clima || "Templado",
      popularidad: datos.popularidad ?? false, // Boolean: false es Joya Oculta
      estanciaSugerida: datos.estanciaSugerida || "Fin de semana",
      dificultad: datos.dificultad || "Bajo (Relax)",
      entorno: datos.entorno || "Rural",
      acceso: datos.acceso || "Vehículo simple"
    };
    const destinoDoc = await addDoc(collection(db, "lugares_turisticos_scrapped"), nuevoLugar);


    const idDestino = destinoDoc.id;

    // 2. Convertir y guardar cada imagen vinculada
    const promesasImagenes = archivos.filter(f => f !== null).map(async (file) => {

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
    console.error("Error guardando en B64:", error);
    throw error;
  }
  };

