import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container, Paper } from '@mui/material';

import { FormularioDestino } from './FormularioDestino';
import { useAuth } from '../../auth/AuthProvider';

export default function PublicarDestino() {
    const navigate = useNavigate();
    const { usuario } = useAuth();

    // Control de acceso para usuarios no autenticados
    if (!usuario) {
        return (
            <Container maxWidth="sm" sx={{ py: 8 }}>
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 1 }}>
                        Sesión requerida
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Debes iniciar sesión en la plataforma para poder registrar y compartir nuevos destinos turísticos.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/login')}
                            sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 'bold', borderRadius: '10px' }}
                        >
                            Iniciar Sesión
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/Destinos')}
                            sx={{ borderColor: '#cbd5e1', color: '#475569', textTransform: 'none', fontWeight: 'bold', borderRadius: '10px' }}
                        >
                            Volver al Catálogo
                        </Button>
                    </Box>
                </Paper>
            </Container>
        );
    }

    // Instancia del formulario en modo de creación
    return (
        <FormularioDestino
            modo="crear"
            usuarioActualId={usuario.uid}
        />
    );
}