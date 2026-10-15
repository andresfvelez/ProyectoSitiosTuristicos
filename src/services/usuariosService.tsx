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
    GoogleAuthProvider,
    FacebookAuthProvider,
    signInWithPopup,
    signInWithCredential,
    User
} from "firebase/auth";
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { FacebookLogin } from '@capacitor-community/facebook-login';
import CryptoJS from "crypto-js";
import emailjs from "@emailjs/browser";
import { db, auth } from "../firebase/firebaseConfig";
import { UserProfileData } from "../Components/models/Usuarios";

export type AccionEstadoUsuario = 'activar' | 'suspender' | 'banear';

/* ==========================================================================
   1. PROVEEDORES Y SEGURIDAD (JWT, AES, RECAPTCHA)
   ========================================================================== */

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const facebookProvider = new FacebookAuthProvider();

/**
 * Valida la expiración del token JWT del usuario activo y cierra sesión si ha caducado.
 */
export const validarVigenciaToken = async (usuario: User): Promise<boolean> => {
    try {
        const tokenResult = await usuario.getIdTokenResult();
        const fechaExpiracionTokenMs = new Date(tokenResult.expirationTime).getTime();
        const ahoraMs = Date.now();

        if (ahoraMs >= fechaExpiracionTokenMs) {
            await auth.signOut();
            return false;
        }
        return true;
    } catch {
        await auth.signOut();
        return false;
    }
};

/**
 * Descifra cadenas encriptadas con algoritmo AES mediante una frase clave.
 */
const desencriptarDatos = (data: string, key: string): string => {
    try {
        const bytes = CryptoJS.AES.decrypt(data, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
        return "";
    }
};

/**
 * Recupera y descifra los parámetros de autenticación para el servicio de mensajería transaccional.
 */
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
    } catch {
        return null;
    }
};

/**
 * Consulta la llave pública de reCAPTCHA configurada en Firestore.
 */
export const obtenerClaveRecaptcha = async (): Promise<string | null> => {
    try {
        const docRefClaves = doc(db, "Constantes", "claves");
        const docSnapClaves = await getDoc(docRefClaves);
        const docRefRecaptcha = doc(db, "Constantes", "Recaptcha");
        const docSnapRecaptcha = await getDoc(docRefRecaptcha);

        if (!docSnapClaves.exists() || !docSnapRecaptcha.exists()) return null;

        const fraseMaestra = docSnapClaves.data().encriptado;
        const dataRecaptcha = docSnapRecaptcha.data();

        if (!dataRecaptcha?.key) return null;

        return desencriptarDatos(dataRecaptcha.key, fraseMaestra);
    } catch {
        return null;
    }
};
/* ==========================================================================
   2. REGISTRO Y GESTIÓN DE ACCESO TRADICIONAL
   ========================================================================== */

/**
 * Registra un nuevo usuario en Authentication, crea su documento base en Firestore
 * y despacha un correo de bienvenida mediante EmailJS.
 */
export const registrarNuevoUsuario = async (
    fullName: string,
    email: string,
    password: string
): Promise<User> => {
    const credenciales = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credenciales.user.uid;

    await setDoc(doc(db, "usuarios", uid), {
        fullName,
        email,
        rol: "turista",
        estado: "activo",
        perfilIncompleto: true,
        fechaCreacion: Date.now()
    });

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
    } catch {
        // Fallo no bloqueante en el despacho del correo
    }

    return credenciales.user;
};

/**
 * Gestiona el restablecimiento de contraseña validando previamente si la cuenta proviene de OAuth.
 */
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
        return { exito: false, errorKey: error.code };
    }
};

/**
 * Verifica si el usuario presenta sanciones activas o bloqueos definitivos.
 */
export const verificarUsuarioBloqueado = async (uid: string): Promise<any> => {
    try {
        const userDocRef = doc(db, "usuarios", uid);
        const userSnap = await getDoc(userDocRef);
        return userSnap.exists() ? userSnap.data() : null;
    } catch {
        return null;
    }
};

/* ==========================================================================
   3. AUTENTICACIÓN HÍBRIDA (WEB / CAPACITOR NATIVO)
   ========================================================================== */

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

export const iniciarSesionGoogleHibrido = async (): Promise<User> => {
    let usuarioAuth: User;

    if (Capacitor.isNativePlatform()) {
        await GoogleAuth.initialize();
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const resultado = await signInWithCredential(auth, credential);
        usuarioAuth = resultado.user;
    } else {
        const resultado = await signInWithPopup(auth, googleProvider);
        usuarioAuth = resultado.user;
    }

    await gestionarIngresoGoogle(usuarioAuth);
    return usuarioAuth;
};

export const iniciarSesionFacebookHibrido = async (): Promise<User> => {
    let usuarioAuth: User;

    if (Capacitor.isNativePlatform()) {
        const result = await FacebookLogin.login({ permissions: ['public_profile', 'email'] });
        if (result.accessToken) {
            const credential = FacebookAuthProvider.credential(result.accessToken.token);
            const resultado = await signInWithCredential(auth, credential);
            usuarioAuth = resultado.user;
        } else {
            throw new Error("No se obtuvo el token de acceso de Facebook.");
        }
    } else {
        const resultado = await signInWithPopup(auth, facebookProvider);
        usuarioAuth = resultado.user;
    }

    await gestionarIngresoFacebook(usuarioAuth);
    return usuarioAuth;
};

/* ==========================================================================
   4. GESTIÓN DE PERFIL Y ARCHIVOS BINARIOS
   ========================================================================== */

export const obtenerPerfilUsuario = async (uid: string): Promise<UserProfileData | null> => {
    try {
        const userDocRef = doc(db, "usuarios", uid);
        const userSnap = await getDoc(userDocRef);
        return userSnap.exists() ? (userSnap.data() as UserProfileData) : null;
    } catch {
        return null;
    }
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

export const convertirFileABase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

export const obtenerFotoPerfilUsuario = async (uid: string): Promise<{ id: string; base64: string } | null> => {
    try {
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
    } catch {
        return null;
    }
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

/* ==========================================================================
   5. ADMINISTRACIÓN, ROLES Y RÉGIMEN SANCIONATORIO
   ========================================================================== */

export const obtenerTodosLosUsuarios = async (): Promise<UserProfileData[]> => {
    try {
        const snapshot = await getDocs(collection(db, "usuarios"));
        return snapshot.docs.map(docSnap => ({
            uid: docSnap.id,
            ...docSnap.data()
        } as UserProfileData));
    } catch {
        return [];
    }
};

export const cambiarRolUsuario = async (uid: string, nuevoRol: string): Promise<boolean> => {
    try {
        const userRef = doc(db, "usuarios", uid);
        await updateDoc(userRef, { rol: nuevoRol });
        return true;
    } catch {
        return false;
    }
};

export const gestionarEstadoUsuario = async (
    uid: string,
    accion: AccionEstadoUsuario,
    opciones?: { diasSuspension?: number; motivo?: string }
): Promise<boolean> => {
    try {
        const userRef = doc(db, "usuarios", uid);
        let dataActualizacion: any = {};

        switch (accion) {
            case 'activar':
                dataActualizacion = {
                    estado: "activo",
                    bloqueadoHasta: null,
                    motivoSancion: null
                };
                break;

            case 'suspender':
                const dias = opciones?.diasSuspension || 1;
                const fechaFinMs = Date.now() + (dias * 24 * 60 * 60 * 1000);
                dataActualizacion = {
                    estado: "suspendido",
                    bloqueadoHasta: fechaFinMs,
                    motivoSancion: opciones?.motivo || "Comportamiento inadecuado"
                };
                break;

            case 'banear':
                dataActualizacion = {
                    estado: "bloqueado",
                    bloqueadoHasta: null,
                    motivoSancion: opciones?.motivo || "Violación de políticas del servicio"
                };
                break;
        }

        await updateDoc(userRef, dataActualizacion);
        return true;
    } catch {
        return false;
    }
};

/* ==========================================================================
   6. GESTIÓN DE MARCADORES FAVORITOS
   ========================================================================== */

export const verificarEsFavorito = async (lugarId: string, usuarioId: string): Promise<boolean> => {
    try {
        const q = query(
            collection(db, "favoritos"),
            where("lugarId", "==", lugarId),
            where("usuarioId", "==", usuarioId)
        );
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch {
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
    } catch {
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
    } catch {
        return false;
    }
};