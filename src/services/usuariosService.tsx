import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {UserProfileData} from "../Components/models/Usuarios";




export const convertirFileABase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

export const obtenerPerfilUsuario = async (uid: string): Promise<UserProfileData | null> => {
    const userDocRef = doc(db, "usuarios", uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
        return userSnap.data() as UserProfileData;
    }
    return null;
};

export const obtenerFotoPerfilUsuario = async (uid: string): Promise<{ id: string; base64: string } | null> => {
    const qFoto = query(
        collection(db, "imagenes_b64"),
        where("idVinculado", "==", uid),
        where("esLugar", "==", false)
    );
    const fotoSnap = await getDocs(qFoto);

    if (!fotoSnap.empty) {
        const docFoto = fotoSnap.docs[0];
        return {
            id: docFoto.id,
            base64: docFoto.data().base64
        };
    }
    return null;
};

export const actualizarPerfilUsuario = async (
    uid: string,
    datos: {
        fullName: string;
        telefono: string;
        ciudad: string;
        biografia: string;
        fechaNacimiento: string;
        clima?: string;
        entorno?: string;
        rangoPresupuesto?: string;
        tipoAcceso?: string;
        ritmo?: string;
        companiaIdeal?: string[];
    }
): Promise<void> => {
    const userDocRef = doc(db, "usuarios", uid);
    await updateDoc(userDocRef, {
        fullName: datos.fullName,
        telefono: datos.telefono,
        ciudad: datos.ciudad,
        biografia: datos.biografia,
        fechaNacimiento: datos.fechaNacimiento,
        clima: datos.clima || '',
        entorno: datos.entorno || '',
        rangoPresupuesto: datos.rangoPresupuesto || '',
        tipoAcceso: datos.tipoAcceso || '',
        ritmo: datos.ritmo || '',
        companiaIdeal: datos.companiaIdeal || [],
        perfilIncompleto: false
    });
};

export const guardarFotoPerfilUsuario = async (
    uid: string,
    file: File,
    fotoDocId?: string | null
): Promise<{ id: string; base64: string }> => {
    const base64String = await convertirFileABase64(file);

    if (fotoDocId) {
        const fotoRef = doc(db, "imagenes_b64", fotoDocId);
        await updateDoc(fotoRef, {
            base64: base64String,
            fechaCreacion: Date.now()
        });
        return { id: fotoDocId, base64: base64String };
    } else {
        const nuevaFotoRef = await addDoc(collection(db, "imagenes_b64"), {
            base64: base64String,
            esLugar: false,
            fechaCreacion: Date.now(),
            idVinculado: uid
        });
        return { id: nuevaFotoRef.id, base64: base64String };
    }
};


export const eliminarFotoPerfilUsuario = async (fotoDocId: string): Promise<void> => {
    const fotoRef = doc(db, "imagenes_b64", fotoDocId);
    await deleteDoc(fotoRef);
};

export const verificarEsFavorito = async (lugarId: string, usuarioId: string): Promise<boolean> => {
    try {
        const q = query(
            collection(db, "favoritos"),
            where("lugarId", "==", lugarId),
            where("usuarioId", "==", usuarioId)
        );
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error("Error al verificar favorito:", error);
        return false;
    }
};

// ❤️ Guardar destino en favoritos
export const guardarFavorito = async (lugarId: string, usuarioId: string): Promise<boolean> => {
    try {
        await addDoc(collection(db, "favoritos"), {
            lugarId,
            usuarioId,
            fecha: Date.now()
        });
        return true;
    } catch (error) {
        console.error("Error al guardar favorito:", error);
        return false;
    }
};

// 💔 Eliminar destino de favoritos
export const eliminarFavorito = async (lugarId: string, usuarioId: string): Promise<boolean> => {
    try {
        const q = query(
            collection(db, "favoritos"),
            where("lugarId", "==", lugarId),
            where("usuarioId", "==", usuarioId)
        );
        const snapshot = await getDocs(q);
        const borrados = snapshot.docs.map((docSnap) => deleteDoc(doc(db, "favoritos", docSnap.id)));
        await Promise.all(borrados);
        return true;
    } catch (error) {
        console.error("Error al eliminar favorito:", error);
        return false;
    }
};