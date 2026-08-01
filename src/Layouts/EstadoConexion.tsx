import * as React from 'react';
import Chip from '@mui/material/Chip';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';

export function EstadoConexion() {
    // 1. Arrancamos asumiendo que sí hay red para evitar alertas falsas en el primer milisegundo
    const [online, setOnline] = React.useState<boolean>(true);

    React.useEffect(() => {
        // 2. Al arrancar el componente, le hacemos una pregunta directa y real al navegador
        if (typeof navigator !== 'undefined') {
            setOnline(navigator.onLine);
        }

        const controlarOnline = () => setOnline(true);
        const controlarOffline = () => setOnline(false);

        // Escuchadores para cambios en tiempo real
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
                margin: '0 15px', // Le da un espacio respirable a los lados
                zIndex: 10
            }}
        >
            {online ? (
                <Chip
                    icon={<WifiIcon />}
                    label="Conectado"
                    color="success"
                    variant="outlined"
                    size="small"
                />
            ) : (
                <Chip
                    icon={<WifiOffIcon />}
                    label="Modo Offline (Caché activa)"
                    color="warning"
                    size="small"
                />
            )}
        </div>
    );
}