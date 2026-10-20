import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Material UI
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Rating from '@mui/material/Rating';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import {ejecutarConsultaIA} from "../../../services/IA/IaExecuter";
import {mostrarAlerta} from "../../../Layouts/Utils/alertUtils";


interface ModalRecomendacionesIAProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string;
}

const IMAGEN_FALLBACK = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80";

export const ModalRecomendacionesIA: React.FC<ModalRecomendacionesIAProps> = ({
                                                                                  isOpen,
                                                                                  onClose,
                                                                                  userId
                                                                              }) => {
    const navigate = useNavigate();
    const [cargando, setCargando] = useState<boolean>(false);
    const [recomendaciones, setRecomendaciones] = useState<any[]>([]);
    const [activeIndex, setActiveIndex] = useState<number>(0);

    useEffect(() => {
        if (isOpen && userId && recomendaciones.length === 0) {
            cargarRecomendaciones();
        }
    }, [isOpen, userId]);

    const cargarRecomendaciones = async () => {
        if (!userId) return;
        setCargando(true);
        try {
            const resultados = await ejecutarConsultaIA(userId, 10);
            setRecomendaciones(resultados || []);
            setActiveIndex(0);
        } catch (error) {
            console.error("Error cargando recomendaciones IA:", error);
            mostrarAlerta({
                title: 'Error al consultar IA',
                text: 'No pudimos generar tus recomendaciones en este momento.',
                icon: 'error'
            });
        } finally {
            setCargando(false);
        }
    };

    const nextSlide = () => {
        if (recomendaciones.length === 0) return;
        setActiveIndex((prev) => (prev === recomendaciones.length - 1 ? 0 : prev + 1));
    };

    const prevSlide = () => {
        if (recomendaciones.length === 0) return;
        setActiveIndex((prev) => (prev === 0 ? recomendaciones.length - 1 : prev - 1));
    };

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '24px',
                    overflow: 'hidden',
                    p: 0,
                    maxHeight: '90vh',
                    bgcolor: '#0f172a'
                }
            }}
        >
            {/* Header del Modal */}
            <Box
                sx={{
                    p: { xs: 2, sm: 2.5 },
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <AutoAwesomeIcon sx={{ color: '#38bdf8' }} />
                    <Box>
                        <Typography variant="h6" fontWeight="800" sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }}>
                            Recomendaciones Personalizadas ({recomendaciones.length})
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                            Generadas por Gemini según tus gustos, clima y presupuesto
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#0f172a' }}>
                {cargando ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <CircularProgress size={48} sx={{ color: '#38bdf8', mb: 2 }} />
                        <Typography variant="body1" fontWeight="700" color="#ffffff">
                            Gemini está analizando las opciones ideales para ti...
                        </Typography>
                        <Typography variant="caption" color="#94a3b8">
                            Evaluando coincidencia de entorno, clima y presupuesto
                        </Typography>
                    </Box>
                ) : recomendaciones.length === 0 ? (
                    <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
                        <Typography variant="body1" color="#94a3b8">
                            No se encontraron recomendaciones ajustadas a tu perfil en este momento.
                        </Typography>
                    </Box>
                ) : (
                    <Box>
                        {/* BANNER CARRUSEL */}
                        <Box
                            sx={{
                                position: 'relative',
                                width: '100%',
                                borderRadius: '20px',
                                overflow: 'hidden',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                                height: { xs: '360px', sm: '420px' },
                                bgcolor: '#1e293b',
                                mb: 2.5
                            }}
                        >
                            {/* Botón Izquierdo */}
                            <IconButton
                                onClick={prevSlide}
                                sx={{
                                    position: 'absolute',
                                    left: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 10,
                                    bgcolor: 'rgba(15, 23, 42, 0.75)',
                                    color: '#ffffff',
                                    backdropFilter: 'blur(4px)',
                                    '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.95)' }
                                }}
                            >
                                <ArrowBackIosNewIcon fontSize="small" />
                            </IconButton>

                            {/* Botón Derecho */}
                            <IconButton
                                onClick={nextSlide}
                                sx={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 10,
                                    bgcolor: 'rgba(15, 23, 42, 0.75)',
                                    color: '#ffffff',
                                    backdropFilter: 'blur(4px)',
                                    '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.95)' }
                                }}
                            >
                                <ArrowForwardIosIcon fontSize="small" />
                            </IconButton>

                            {/* Pista de Diapositivas */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    width: '100%',
                                    height: '100%',
                                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    transform: `translateX(-${activeIndex * 100}%)`
                                }}
                            >
                                {recomendaciones.map((lugar, idx) => {
                                    let imagenPortada = IMAGEN_FALLBACK;
                                    if (Array.isArray(lugar.imagenes) && lugar.imagenes.length > 0) {
                                        const imgObj = lugar.imagenes[0];
                                        imagenPortada = typeof imgObj === 'string' ? imgObj : (imgObj?.url || imgObj?.base64 || IMAGEN_FALLBACK);
                                    } else if (lugar.imagenUrl) {
                                        imagenPortada = lugar.imagenUrl;
                                    } else if (lugar.imagen) {
                                        imagenPortada = lugar.imagen;
                                    }

                                    const porcentajeMatch = Math.round((lugar.Score_IA || 0) * 100);

                                    return (
                                        <Box
                                            key={lugar.id || idx}
                                            sx={{
                                                minWidth: '100%',
                                                height: '100%',
                                                position: 'relative'
                                            }}
                                        >
                                            <img
                                                src={imagenPortada}
                                                alt={lugar.nombre || lugar.name || "Destino"}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = IMAGEN_FALLBACK;
                                                }}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />

                                            {/* Badge de Afinidad */}
                                            <Chip
                                                icon={<AutoAwesomeIcon style={{ color: '#ffffff', fontSize: '1rem' }} />}
                                                label={`${porcentajeMatch}% Afinidad`}
                                                sx={{
                                                    position: 'absolute',
                                                    top: 16,
                                                    left: 16,
                                                    bgcolor: '#0284c7',
                                                    color: '#ffffff',
                                                    fontWeight: '800',
                                                    boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                                                    zIndex: 5
                                                }}
                                            />

                                            {/* Informacion overlay */}
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    background: 'linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.95) 75%)',
                                                    pt: 8,
                                                    pb: 3,
                                                    px: { xs: 3, sm: 5 },
                                                    color: '#ffffff',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'flex-end'
                                                }}
                                            >
                                                <Typography variant="h5" fontWeight="800" sx={{ mb: 0.5, fontSize: { xs: '1.2rem', sm: '1.6rem' }, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                                    {lugar.nombre || lugar.name || 'Sin Nombre'}
                                                </Typography>

                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                                                    <Rating value={Number(lugar.puntuacion || lugar.rating || 5)} precision={0.1} readOnly size="small" />
                                                    <Typography variant="body2" fontWeight="700">
                                                        {lugar.puntuacion ? Number(lugar.puntuacion).toFixed(1) : '5.0'}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#cbd5e1', ml: 1 }}>
                                                        📍 {lugar.ciudad || lugar.city || 'Colombia'}
                                                    </Typography>
                                                </Stack>

                                                <Box
                                                    sx={{
                                                        bgcolor: 'rgba(2, 132, 199, 0.30)',
                                                        backdropFilter: 'blur(6px)',
                                                        border: '1px solid rgba(56, 189, 248, 0.4)',
                                                        borderRadius: '12px',
                                                        p: 1.5,
                                                        mb: 2,
                                                        maxWidth: '650px'
                                                    }}
                                                >
                                                    <Typography variant="body2" fontStyle="italic" sx={{ color: '#f0f9ff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                                        "{lugar.Motivo}"
                                                    </Typography>
                                                </Box>

                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    onClick={() => {
                                                        onClose();
                                                        navigate(`/destino/${lugar.id}`);
                                                    }}
                                                    sx={{
                                                        width: 'fit-content',
                                                        bgcolor: '#ffffff',
                                                        color: '#0f172a',
                                                        fontWeight: '800',
                                                        borderRadius: '10px',
                                                        px: 3,
                                                        '&:hover': { bgcolor: '#f1f5f9' }
                                                    }}
                                                >
                                                    Ver Destino
                                                </Button>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>

                        {/* SELECTOR INFERIOR DE CHIPS */}
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1,
                                overflowX: 'auto',
                                pb: 1,
                                pt: 0.5,
                                maxWidth: '100%',
                                '&::-webkit-scrollbar': { height: '6px' },
                                '&::-webkit-scrollbar-thumb': { bgcolor: '#334155', borderRadius: '10px' }
                            }}
                        >
                            {recomendaciones.map((item, i) => (
                                <Chip
                                    key={item.id || i}
                                    label={`${i + 1}. ${item.nombre || item.name}`}
                                    onClick={() => setActiveIndex(i)}
                                    variant={activeIndex === i ? 'filled' : 'outlined'}
                                    sx={{
                                        bgcolor: activeIndex === i ? '#0284c7' : 'transparent',
                                        color: activeIndex === i ? '#ffffff' : '#94a3b8',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        borderColor: activeIndex === i ? '#0284c7' : '#334155',
                                        '&:hover': { bgcolor: activeIndex === i ? '#0284c7' : '#1e293b' }
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};