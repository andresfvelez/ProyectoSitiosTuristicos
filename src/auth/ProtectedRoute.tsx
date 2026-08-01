import * as React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider'; // Importamos tu contexto global
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface ProtectedRouteProps {
    rolesPermitidos: string[]; // Lista de roles que sí pueden ver esta página (ej: ['administrador'])
}

export const ProtectedRoute = ({ rolesPermitidos }: ProtectedRouteProps) => {
    const { usuario, rol, cargando } = useAuth();

    // 1. Mientras Firebase está leyendo el token y Firestore el rol, congelamos la pantalla de forma elegante
    if (cargando) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography variant="h6" color="text.secondary">Verificando autorizaciones...</Typography>
            </Box>
        );
    }

    if (!usuario) {
        return <Navigate to="/login" replace />;
    }

    // 3. Si está logueado pero su rol NO está en la lista de aprobados, lo mandamos a una pantalla de acceso denegado
    if (!rol || !rolesPermitidos.includes(rol)) {
        console.warn(`🛑 Acceso bloqueado para el uid: ${usuario.uid}. Intento de intrusión con rol: ${rol}`);
        return <Navigate to="/" replace />;
    }

    // 4. Si pasa todas las validaciones de seguridad, renderiza los componentes hijos con el Outlet de React Router
    return <Outlet />;
};