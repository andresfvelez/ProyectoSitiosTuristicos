import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FormularioDestino } from './FormularioDestino';
import { obtenerLugarPorId } from '../../services/lugaresService';
import { LugarTuristico } from "../models/LugarTuristico";
import { useAuth } from '../../auth/AuthProvider';
import { Box, Typography, Button } from '@mui/material';

export default function EditarDestino() {
    const { id } = useParams<{ id: string }>();
    const [lugar, setLugar] = useState<LugarTuristico | null>(null);
    const { usuario,rol } = useAuth(); // Asumiendo que 'usuario' trae { uid, rol }
    const navigate = useNavigate();

    useEffect(() => {
        if (id) {
            obtenerLugarPorId(id).then((res) => {
                if (res) setLugar(res);
            });
        }
    }, [id]);

    if (!lugar) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando datos del sitio...</div>;
    }

    if (!usuario) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Debes iniciar sesión para editar.</div>;
    }

    // 🔒 VALIDACIÓN DE PERMISOS DE EDICIÓN
    const esCreador = lugar.creadorId === usuario.uid;
    const esAdmin = rol === 'administrador'; // O el campo de rol que tengas

    if (!esCreador && !esAdmin) {
        return (
            <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography variant="h5" color="error" fontWeight="bold">
                    Acceso Denegado
                </Typography>
                <Typography variant="body1" sx={{ mt: 1, mb: 3 }}>
                    No tienes permisos para editar este sitio. Solo el usuario que lo creó o un administrador pueden modificarlo.
                </Typography>
                <Button variant="contained" onClick={() => navigate('/')}>
                    Volver al Inicio
                </Button>
            </Box>
        );
    }

    return (
        <FormularioDestino
            modo="editar"
            datosIniciales={lugar}
            usuarioActualId={usuario.uid}
        />
    );
}