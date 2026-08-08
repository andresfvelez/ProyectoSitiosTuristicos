import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    setDoc
} from "firebase/firestore";
import {
    sendPasswordResetEmail,
    createUserWithEmailAndPassword,
    User
} from "firebase/auth";
import CryptoJS from "crypto-js";
import emailjs from "@emailjs/browser";
import { db, auth } from "../firebase/firebaseConfig";
import { UserProfileData } from "../Components/models/Usuarios";

// 🔐 Auxiliar para desencriptar cadenas AES
const desencriptarDatos = (data: string, key: string): string => {
    try {
        const bytes = CryptoJS.AES.decrypt(data, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        return "";
    }
};

// 🔑 Obtener datos del servicio de correos desde Firestore y desencriptarlos
export const obtenerMessagingData = async () => {
    try {
        const docRef = doc(db, "Constantes", "claves");
        const docSnap = await getDoc(docRef);
        const docRefEmail = doc(db, "Constantes", "email_data");
        const docSnapEmail = await getDoc(docRefEmail);

        if (!docSnap.exists() || !docSnapEmail.exists()) return null;

        const fraseMaestra = docSnap.data().encriptado;
        const dataEmail = docSnapEmail.data();

        return {
            template_creacion_usuarios: desencriptarDatos(dataEmail.template_creacion_usuarios, fraseMaestra),
            service: desencriptarDatos(dataEmail.service, fraseMaestra),
            key: desencriptarDatos(dataEmail.key, fraseMaestra)
        };
    } catch (error) {
        console.error("Error desencriptando datos de mensajería:", error);
        return null;
    }
};

// 📝 Registrar usuario en Auth, guardar en Firestore y enviar correo de bienvenida
export const registrarNuevoUsuario = async (
    fullName: string,
    email: string,
    password: string
): Promise<User> => {
    // 1. Crear credenciales en Firebase Auth
    const credenciales = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credenciales.user.uid;

    // 2. Guardar registro inicial en Firestore
    await setDoc(doc(db, "usuarios", uid), {
        fullName,
        email,
        rol: "turista",
        estado: "activo",
        perfilIncompleto: true,
        fechaCreacion: Date.now()
    });

    // 3. Notificación por EmailJS (no bloquea si falla el envío)
    try {
        const emailData = await obtenerMessagingData();
        if (emailData) {
            await emailjs.send(
                emailData.service,
                emailData.template_creacion_usuarios,
                {
                    user: fullName,
                    email_user: email,
                    password: password,
                    link: window.location.origin
                },
                emailData.key
            );
        }
    } catch (emailError) {
        console.error("Error al enviar el correo de bienvenida:", emailError);
    }

    return credenciales.user;
};

// 📧 Enviar correo de recuperación verificando si la cuenta proviene de Google
export const enviarCorreoRecuperacion = async (
    email: string
): Promise<{ exito: boolean; esExterno?: boolean; errorKey?: string }> => {
    try {
        const q = query(collection(db, "usuarios"), where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const datosUsuario = querySnapshot.docs[0].data();
            if (datosUsuario.proveedor === "google" || datosUsuario.proveedor === "facebook") {
                return { exito: false, esExterno: true };
            }
        }

        await sendPasswordResetEmail(auth, email);
        return { exito: true };
    } catch (error: any) {
        console.error("Error al enviar correo de recuperación:", error);
        return { exito: false, errorKey: error.code };
    }
};

// 🛑 Verificar si el usuario se encuentra bloqueado
export const verificarUsuarioBloqueado = async (uid: string): Promise<boolean> => {
    try {
        const userDocRef = doc(db, "usuarios", uid);
        const userSnap = await getDoc(userDocRef);
        return userSnap.exists() && userSnap.data()?.estado === "bloqueado";
    } catch (error) {
        console.error("Error al verificar estado del usuario:", error);
        return false;
    }
};

// 👤 Registrar perfil base tras autenticarse por Google
export const gestionarIngresoGoogle = async (usuario: User): Promise<void> => {
    const userDocRef = doc(db, "usuarios", usuario.uid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
        await setDoc(userDocRef, {
            fullName: usuario.displayName || "Usuario de Google",
            email: usuario.email,
            rol: "turista",
            estado: "activo",
            proveedor: "google",
            perfilIncompleto: true,
            fechaCreacion: Date.now(),
            correoBienvenidaEnviado: true
        });
    }
};

// 👤 Registrar perfil base tras autenticarse por Facebook
export const gestionarIngresoFacebook = async (usuario: User): Promise<void> => {
    const userDocRef = doc(db, "usuarios", usuario.uid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
        await setDoc(userDocRef, {
            fullName: usuario.displayName || "Usuario de Facebook",
            email: usuario.email,
            rol: "turista",
            estado: "activo",
            proveedor: "facebook",
            perfilIncompleto: true,
            fechaCreacion: Date.now(),
            correoBienvenidaEnviado: true
        });
    }
};

// 🔑 Obtener clave del reCAPTCHA
export const obtenerClaveRecaptcha = async (): Promise<string | null> => {
    try {
        const docRefRecaptcha = doc(db, "Constantes", "Recaptcha");
        const docSnapRecaptcha = await getDoc(docRefRecaptcha);
        return docSnapRecaptcha.exists() ? docSnapRecaptcha.data()?.key || null : null;
    } catch (error) {
        console.error("Error obteniendo clave de reCAPTCHA:", error);
        return null;
    }
};

// 👤 Obtener perfil completo del usuario
export const obtenerPerfilUsuario = async (uid: string): Promise<UserProfileData | null> => {
    const userDocRef = doc(db, "usuarios", uid);
    const userSnap = await getDoc(userDocRef);
    return userSnap.exists() ? (userSnap.data() as UserProfileData) : null;
};

// 🖼️ Utilidades e imágenes de perfil
export const convertirFileABase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
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

// ❤️ Gestión de Favoritos
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