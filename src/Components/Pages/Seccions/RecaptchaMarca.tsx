import React from 'react';
import { Box, Typography, Link } from '@mui/material';

export const RecaptchaMarca = () => {
    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: '14px',
                right: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                bgcolor: '#f9f9f9',
                border: '1px solid #d3d3d3',
                borderRight: 'none',
                borderRadius: '2px 0 0 2px',
                boxShadow: '0 0 4px rgba(0,0,0,0.15)',
                width: '48px', // Ancho contraído (solo muestra el logo)
                height: '60px',
                overflow: 'hidden',
                transition: 'width 0.3s ease-in-out',
                cursor: 'pointer',
                '&:hover': {
                    width: '215px', // Ancho expandido al pasar el cursor
                },
            }}
        >
            {/* Contenedor del Logo de reCAPTCHA */}
            <Box
                sx={{
                    minWidth: '48px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <img
                    src="https://www.gstatic.com/recaptcha/api2/logo_48.png"
                    alt="reCAPTCHA logo"
                    style={{ width: '32px', height: '32px' }}
                />
            </Box>

            {/* Texto desplegable */}
            <Box
                sx={{
                    whiteSpace: 'nowrap',
                    pr: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                }}
            >
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#555', fontWeight: 'bold', lineHeight: 1.2 }}>
                    Protegido por reCAPTCHA
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
                    <Link
                        href="https://policies.google.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{ fontSize: '9px', color: '#555' }}
                    >
                        Privacidad
                    </Link>
                    <Typography variant="caption" sx={{ fontSize: '9px', color: '#555' }}>-</Typography>
                    <Link
                        href="https://policies.google.com/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{ fontSize: '9px', color: '#555' }}
                    >
                        Términos
                    </Link>
                </Box>
            </Box>
        </Box>
    );
};