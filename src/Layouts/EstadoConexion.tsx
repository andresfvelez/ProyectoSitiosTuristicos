import React, { useState, useEffect } from 'react';
import Chip from '@mui/material/Chip';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';

export const EstadoConexion: React.FC = () => {
    const [online, setOnline] = useState<boolean>(() => {
        return typeof navigator !== 'undefined' ? navigator.onLine : true;
    });

    useEffect(() => {
        const controlarOnline = () => setOnline(true);
        const controlarOffline = () => setOnline(false);

        window.addEventListener('online', controlarOnline);
        window.addEventListener('offline', controlarOffline);

        return () => {
            window.removeEventListener('online', controlarOnline);
            window.removeEventListener('offline', controlarOffline);
        };
    }, []);

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '0 10px',
                zIndex: 10
            }}
        >
            {online ? (
                <Chip
                    icon={<WifiIcon style={{ fontSize: 16 }} />}
                    label="En línea"
                    color="success"
                    variant="outlined"
                    size="small"
                    sx={{
                        fontSize: '0.75rem',
                        height: 24,
                        fontWeight: 600,
                        borderColor: '#22c55e',
                        color: '#15803d'
                    }}
                />
            ) : (
                <Chip
                    icon={<WifiOffIcon style={{ fontSize: 16 }} />}
                    label="Modo Offline"
                    color="warning"
                    size="small"
                    sx={{
                        fontSize: '0.75rem',
                        height: 24,
                        fontWeight: 700,
                        bgcolor: '#fef3c7',
                        color: '#b45309',
                        border: '1px solid #f59e0b'
                    }}
                />
            )}
        </div>
    );
};