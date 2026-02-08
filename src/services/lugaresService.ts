import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/firebaseConfig';
import { LugarTuristico } from '../Components/models/LugarTuristico';


export const obtenerLugares = async (): Promise<LugarTuristico[]> => {
  const snapshot = await getDocs(collection(db, 'lugares_turisticos'));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as LugarTuristico[];
};


export const obtenerImagenesPorDestino = async (idDestino: string): Promise<string[]> => {
  try {
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
      categoria: datos.categoria || "restaurante",
      latitud: ubicacion.lat,
      longitud: ubicacion.lng,
      ciudad: datos.ciudad || datos.pais || "", // Ajuste según tu form
      departamento: datos.departamento || "",
      puntuacion: 0,
      opiniones: "",
      pais: datos.pais || "",
      minimo: datos.minimo || 0,
      recomendado: datos.recomendado || 0,
      fechaRegistro: Date.now(),
      imagenes: [] // Inicialmente vacío
    };
    const destinoDoc = await addDoc(collection(db, "lugares_turisticos"), nuevoLugar);


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

