import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FormularioDestino } from './FormularioDestino';
import { obtenerLugarPorId } from '../../services/lugaresService';
import { LugarTuristico } from "../models/LugarTuristico";
import { useAuth } from '../../auth/AuthProvider';
import { Box, Typography, Button, CircularProgress, Container, Paper } from '@mui/material';

export default function EditarDestino() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { usuario, rol } = useAuth();

    const [lugar, setLugar] = useState<LugarTuristico | null>(null);
    const [cargando, setCargando] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;

        if (id) {
            setCargando(true);
            obtenerLugarPorId(id)
                .then((res) => {
                    if (isMounted) {
                        setLugar(res);
                        setCargando(false);
                    }
                })
                .catch(() => {
                    if (isMounted) {
                        setLugar(null);
                        setCargando(false);
                    }
                });
        } else {
            setCargando(false);
        }

        return () => {
            isMounted = false;
        };
    }, [id]);

    // Estado 1: Recuperación de datos asíncronos
    if (cargando) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
                <CircularProgress size={40} sx={{ color: '#0284c7' }} />
                <Typography variant="body2" color="text.secondary">
                    Cargando información del destino...
                </Typography>
            </Box>
        );
    }

    // Estado 2: Control de sesión activa
    if (!usuario) {
        return (
            <Container maxWidth="sm" sx={{ py: 8 }}>
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
                    <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 1 }}>
                        Sesión requerida
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Debes iniciar sesión con tu cuenta para acceder al editor de contenido.
                    </Typography>
                    <Button variant="contained" onClick={() => navigate('/login')} sx={{ bgcolor: '#0284c7' }}>
                        Iniciar Sesión
                    </Button>
                </Paper>
            </Container>
        );
    }

    // Estado 3: Identificador no encontrado en la base de datos
    if (!lugar) {
        return (
            <Container maxWidth="sm" sx={{ py: 8 }}>
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
                    <Typography variant="h6" fontWeight="bold" color="error" sx={{ mb: 1 }}>
                        Destino no encontrado
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        El identificador solicitado no existe o fue retirado del sistema.
                    </Typography>
                    <Button variant="outlined" onClick={() => navigate('/Destinos')}>
                        Regresar al Catálogo
                    </Button>
                </Paper>
            </Container>
        );
    }

    // Estado 4: Control de permisos de autoría y administración
    const esCreador = lugar.creadorId === usuario.uid;
    const esAdmin = rol === 'administrador';

    if (!esCreador && !esAdmin) {
        return (
            <Container maxWidth="sm" sx={{ py: 8 }}>
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
                    <Typography variant="h6" fontWeight="bold" color="error" sx={{ mb: 1 }}>
                        Acceso Restringido
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        No dispones de los privilegios requeridos para modificar este registro. La edición está reservada al autor de la publicación o a un administrador.
                    </Typography>
                    <Button variant="contained" onClick={() => navigate('/Destinos')} sx={{ bgcolor: '#0284c7' }}>
                        Volver a Destinos
                    </Button>
                </Paper>
            </Container>
        );
    }

    // Renderizado del formulario en modo edición
    return (
        <FormularioDestino
            modo="editar"
            datosIniciales={lugar}
            usuarioActualId={usuario.uid}
        />
    );
}