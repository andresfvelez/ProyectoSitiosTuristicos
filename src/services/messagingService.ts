import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { app, db } from "../firebase/firebaseConfig"; // Tu inicialización de Firebase

const messaging = getMessaging(app);

// 1. Solicitar permisos del navegador y obtener el Token de FCM
export const solicitarPermisosYObtenerToken = async (idUsuario: string) => {
    try {
        // Solicitamos permiso al sistema operativo/navegador
        const permiso = await Notification.requestPermission();

        if (permiso === "granted") {
            // Reemplaza 'TU_VAPID_KEY_DE_FIREBASE' con la clave pública que encuentras en:
            // Consola Firebase -> Configuración del proyecto -> Cloud Messaging -> Web Push certificates
            const tokenFCM = await getToken(messaging, { vapidKey: "TU_VAPID_KEY_DE_FIREBASE" });

            if (tokenFCM) {
                console.log("Token FCM generado con éxito:", tokenFCM);

                // Vinculamos el token al documento del usuario en Firestore para saber a quién notificar
                const userRef = doc(db, "usuarios", idUsuario);
                await updateDoc(userRef, { tokenNotificacion: tokenFCM });

                return tokenFCM;
            }
        } else {
            console.warn("El usuario denegó los permisos de notificación.");
        }
    } catch (error) {
        console.error("Error al configurar FCM en el cliente:", error);
    }
};

// 2. Escuchar notificaciones en primer plano (Cuando el usuario tiene la app abierta)
export const escucharNotificacionesEnPrimerPlano = () => {
    onMessage(messaging, (payload) => {
        console.log("Notificación recibida en tiempo real:", payload);
        // Aquí puedes disparar una alerta visual, un toast o un modal estético en tu UI
        alert(`[${payload.notification?.title}]: ${payload.notification?.body}`);
    });
};