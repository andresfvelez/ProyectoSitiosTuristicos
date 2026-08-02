import React from 'react';
import { FormularioDestino } from './FormularioDestino';
import { useAuth } from '../../auth/AuthProvider';
import { Typography } from 'antd';
import {Box} from "@mui/material";
export default function PublicarDestino() {
    const { usuario } = useAuth();
    if (!usuario) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="error">Debes iniciar sesión para publicar un destino.</Typography>
            </Box>
        );
    }
    return (
        <FormularioDestino
            modo="crear"
            usuarioActualId={usuario.uid}
        />
    );
}