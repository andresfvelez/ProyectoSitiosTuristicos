import * as React from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig'; // Ajusta tu ruta

// 1. Definimos qué datos va a compartir nuestro contexto
interface AuthContextType {
    usuario: User | null;         // Datos de Firebase Auth (email, uid, etc.)
    rol: string | null;           // El rol que viene de Firestore (turista, administrador)
    cargando: boolean;            // Para saber si la app aún está leyendo el LocalStorage
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [usuario, setUsuario] = React.useState<User | null>(null);
    const [rol, setRol] = React.useState<string | null>(null);
    const [cargando, setCargando] = React.useState<boolean>(true);

    React.useEffect(() => {
        // Escuchador global de la persistencia de Firebase
        const desuscribir = onAuthStateChanged(auth, async (userFirebase) => {
            if (userFirebase) {
                setUsuario(userFirebase);

                // 🔄 Aprovechamos y traemos su ROL de Firestore de una vez
                const docRef = doc(db, "usuarios", userFirebase.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setRol(docSnap.data().rol);
                }
            } else {
                setUsuario(null);
                setRol(null);
            }
            setCargando(false); // Ya terminó de verificar la sesión en caché
        });

        return () => desuscribir();
    }, []);

    return (
        <AuthContext.Provider value={{ usuario, rol, cargando }}>
            {!cargando && children}
        </AuthContext.Provider>
    );
};

// Hook personalizado para usar el contexto de forma fácil en cualquier lado
export const useAuth = () => {
    const context = React.useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth debe ser usado dentro de un AuthProvider");
    }
    return context;
};