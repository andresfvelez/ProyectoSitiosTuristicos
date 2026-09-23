import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Stack, Rating, IconButton } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

import { LugarTuristico } from '../models/LugarTuristico';
import {
    obtenerImagenesPorDestino,
    obtenerLugares, recalcularPuntuacionesGenerales
} from "../../services/lugaresService";
import FeaturedPost from './Seccions/Cards';
import "../Pages/styles/Homepage.css";
import {ejecutarPobladoComentariosFaltantes} from "./poblarOpiniones";
import {exportarLugaresSinOpinionesAJSON, obtenerLlavesGemini} from "../../services/IA/Iaservice";
import {curarLugaresYComentariosDuplicados} from "./reemplazarComentarios";
import {poblarEtiquetasAventura} from "./aplicarEtiquetas";
import {ejecutarConsultaIA} from "../../services/IA/IaExecuter";
import {auth} from "../../firebase/firebaseConfig";

const InitialPage = () => {
    const navigate = useNavigate();

    const [lugaresBanner, setLugaresBanner] = useState<LugarTuristico[]>([]);
    const [lugaresPopulares, setLugaresPopulares] = useState<LugarTuristico[]>([]);

    const [cargando, setCargando] = useState<boolean>(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const cargarTodo = async () => {
            setCargando(true);
            const listaLugares = await obtenerLugares();

            //recalcularPuntuacionesGenerales();
            //curarLugaresYComentariosDuplicados();
            //poblarEtiquetasAventura();
            /*
            const usuarioActual = auth.currentUser;
            if (usuarioActual!=null)
            {
                console.log(usuarioActual)
                const consulta= await ejecutarConsultaIA(usuarioActual.uid);
                console.log(consulta)
            }

             */

            const lugaresConFotos = await Promise.all(
                listaLugares.map(async (lugar) => {
                    const fotos = await obtenerImagenesPorDestino(lugar.id!);
                    return {
                        ...lugar,
                        imagenes: fotos
                    };
                })
            );

            // Ordenamiento por puntuación descendente
            const ordenados = lugaresConFotos.sort(
                (a, b) => (b.puntuacion || 0) - (a.puntuacion || 0)
            );

            setLugaresBanner(ordenados.slice(0, 5));
            setLugaresPopulares(ordenados.slice(0, 20));
            setCargando(false);
        };

        cargarTodo();
    }, []);

    const scrollBanner = (direction: 'left' | 'right') => {
        if (lugaresBanner.length === 0) return;
        if (direction === "left") {
            setActiveIndex((prev) => (prev === 0 ? lugaresBanner.length - 1 : prev - 1));
        } else {
            setActiveIndex((prev) => (prev === lugaresBanner.length - 1 ? 0 : prev + 1));
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollToPosition = direction === "left"
                ? scrollLeft - clientWidth
                : scrollLeft + clientWidth;

            scrollRef.current.scrollTo({
                left: scrollToPosition,
                behavior: "smooth"
            });
        }
    };

    if (cargando) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Typography variant="h6" color="text.secondary" fontWeight="600">Cargando destinos...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 6, pt: 2, px: { xs: 2, md: 4 } }}>
            {/* 🌟 BANNER HERO ESTILIZADO CON TOP 5 */}
            {lugaresBanner.length > 0 && (
                <Box
                    sx={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '1300px',
                        margin: '0 auto 40px auto',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        boxShadow: '0 12px 35px rgba(0,0,0,0.12)',
                        height: { xs: '320px', md: '460px' }
                    }}
                >
                    {/* BOTÓN IZQUIERDO */}
                    <IconButton
                        onClick={() => scrollBanner("left")}
                        sx={{
                            position: 'absolute',
                            left: 16,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 10,
                            bgcolor: 'rgba(255, 255, 255, 0.85)',
                            backdropFilter: 'blur(4px)',
                            color: '#0f172a',
                            '&:hover': { bgcolor: '#ffffff' },
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                    >
                        <ArrowBackIosNewIcon fontSize="small" />
                    </IconButton>

                    {/* BOTÓN DERECHO */}
                    <IconButton
                        onClick={() => scrollBanner("right")}
                        sx={{
                            position: 'absolute',
                            right: 16,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 10,
                            bgcolor: 'rgba(255, 255, 255, 0.85)',
                            backdropFilter: 'blur(4px)',
                            color: '#0f172a',
                            '&:hover': { bgcolor: '#ffffff' },
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                    >
                        <ArrowForwardIosIcon fontSize="small" />
                    </IconButton>

                    {/* PISTA DEL BANNER */}
                    <Box
                        sx={{
                            display: 'flex',
                            width: '100%',
                            height: '100%',
                            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: `translateX(-${activeIndex * 100}%)`
                        }}
                    >
                        {lugaresBanner.map((lugar) => {
                            const imagenPortada = lugar.imagenes?.[0] || 'https://via.placeholder.com/1200x500?text=Sin+Imagen';

                            return (
                                <Box
                                    key={lugar.id}
                                    onClick={() => navigate(`/pagina2/${lugar.id}`)}
                                    sx={{
                                        minWidth: '100%',
                                        height: '100%',
                                        position: 'relative',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <img
                                        src={imagenPortada}
                                        alt={lugar.nombre}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />

                                    {/* OVERLAY CON MÁRGENES Y DEGRADADO SUAVE */}
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)',
                                            pt: 8,
                                            pb: 4,
                                            px: { xs: 7, md: 9 }, // 👈 Espaciado extra a los lados para no chocar con los botones
                                            color: '#ffffff'
                                        }}
                                    >
                                        <Typography
                                            variant="h4"
                                            fontWeight="800"
                                            sx={{
                                                mb: 1,
                                                fontSize: { xs: '1.4rem', md: '2.2rem' },
                                                textShadow: '0 2px 6px rgba(0,0,0,0.6)'
                                            }}
                                        >
                                            {lugar.nombre}
                                        </Typography>

                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                            <Rating value={lugar.puntuacion || 5} precision={0.1} readOnly size="small" />
                                            <Typography variant="body2" fontWeight="700">
                                                {lugar.puntuacion ? lugar.puntuacion.toFixed(1) : '5.0'}
                                            </Typography>
                                        </Stack>

                                        <Typography
                                            variant="body2"
                                            sx={{
                                                opacity: 0.9,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                maxWidth: '700px',
                                                fontSize: { xs: '0.85rem', md: '0.95rem' }
                                            }}
                                        >
                                            {lugar.descripcion || 'Descubre uno de los destinos más calificados por nuestra comunidad.'}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            )}

            {/* 🏆 DESTINOS POPULARES (TOP 20) */}
            <Box sx={{ maxWidth: '1300px', margin: '0 auto' }}>
                <Typography variant="h5" fontWeight="800" sx={{ mb: 3, color: '#0f172a' }}>
                    Destinos Populares
                </Typography>

                {lugaresPopulares.length > 0 && (
                    <div className="slider-container" style={{ position: 'relative' }}>
                        <button className="nav-btn left" onClick={() => scroll("left")}>
                            <ArrowBackIosNewIcon fontSize="small" />
                        </button>

                        <div className="cards-track" ref={scrollRef}>
                            {lugaresPopulares.map((post) => (
                                <FeaturedPost key={post.id} post={post} ventana="principal" sub="0" />
                            ))}
                        </div>

                        <button className="nav-btn right" onClick={() => scroll("right")}>
                            <ArrowForwardIosIcon fontSize="small" />
                        </button>
                    </div>
                )}
            </Box>
        </Box>
    );
};

export default InitialPage;