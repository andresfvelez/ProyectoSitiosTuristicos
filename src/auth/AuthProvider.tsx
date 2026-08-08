import * as React from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { mostrarAlerta } from '../Layouts/Utils/alertUtils';

interface AuthContextType {
    usuario: User | null;
    rol: string | null;
    cargando: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [usuario, setUsuario] = React.useState<User | null>(null);
    const [rol, setRol] = React.useState<string | null>(null);
    const [cargando, setCargando] = React.useState<boolean>(true);

    React.useEffect(() => {
        //  Escuchador global de autenticación
        const desuscribir = onAuthStateChanged(auth, async (userFirebase) => {
            if (userFirebase) {
                const esValido = await validarVigenciaToken(userFirebase);

                if (esValido) {
                    setUsuario(userFirebase);
                    const docRef = doc(db, "usuarios", userFirebase.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setRol(docSnap.data().rol);
                    }
                } else {
                    setUsuario(null);
                    setRol(null);
                    mostrarAlerta({
                        title: 'Sesión Expirada',
                        text: 'Tu tiempo de sesión ha caducado por seguridad. Por favor ingresa nuevamente.',
                        icon: 'warning'
                    });
                }
            } else {
                setUsuario(null);
                setRol(null);
            }
            setCargando(false);
        });

        // Verificación periódica del token cada 5 min
        const intervaloAFK = setInterval(async () => {
            if (auth.currentUser) {
                const esValido = await validarVigenciaToken(auth.currentUser);
                if (!esValido) {
                    setUsuario(null);
                    setRol(null);
                    mostrarAlerta({
                        title: 'Sesión Expirada',
                        text: 'Tu tiempo límite de sesión ha caducado. Por favor ingresa nuevamente.',
                        icon: 'warning'
                    });
                }
            }
        }, 5 * 60 * 1000);

        return () => {
            desuscribir();
            clearInterval(intervaloAFK);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ usuario, rol, cargando }}>
            {!cargando && children}
        </AuthContext.Provider>
    );
};

export const validarVigenciaToken = async (usuario: User): Promise<boolean> => {
    try {
        const tokenResult = await usuario.getIdTokenResult();
        console.log("Expiración del token actual (exp):", tokenResult.expirationTime);
        console.log("Hora del login original (auth_time):", tokenResult.authTime);
        // Expiración calculada directamente desde la firma del JWT (propiedad exp)
        const fechaExpiracionTokenMs = new Date(tokenResult.expirationTime).getTime();
        const ahoraMs = Date.now();

        // Si la hora actual sobrepasó la fecha límite que traía el token
        if (ahoraMs >= fechaExpiracionTokenMs) {
            await auth.signOut();
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error al decodificar o validar el token JWT:", error);
        await auth.signOut();
        return false;
    }
};

export const useAuth = () => {
    const context = React.useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth debe ser usado dentro de un AuthProvider");
    }
    return context;
};