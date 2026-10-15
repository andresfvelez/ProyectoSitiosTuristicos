import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, message } from "antd";

// Iconos Material UI (Mismos que destino)
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import StarIcon from "@mui/icons-material/Star";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DinnerDiningIcon from "@mui/icons-material/DinnerDining";
import HotelIcon from "@mui/icons-material/Hotel";
import CloseIcon from "@mui/icons-material/Close";
import RemoveRedEyeIcon from "@mui/icons-material/RemoveRedEye";
import { Box, Typography, Stack, IconButton, CircularProgress } from "@mui/material";

// Estilos
import "../styles/Cards.css";
import "../../Pages/styles/Lugar.css";
import Missingimg from "../../../Layouts/Images/missing.png";
import { LugarTuristico } from "../../models/LugarTuristico";
import { useAuth } from "../../../auth/AuthProvider";
import { eliminarFavorito, guardarFavorito, verificarEsFavorito } from "../../../services/usuariosService";
import { calcularDistanciaKm } from "../../../services/ValidacionLugar";
import { obtenerLugares } from "../../../services/lugaresService";

interface FeaturedPostProps {
    post: LugarTuristico;
    sub?: any;
    ventana: string;
}

export default function FeaturedPost(props: FeaturedPostProps) {
    const { post, ventana, sub } = props;
    const { usuario } = useAuth();
    const navigate = useNavigate();

    const esCategoriaEspecial = useMemo(() => {
        return post?.categoria === 'aventura' || post?.categoria === 'Área Natural';
    }, [post?.categoria]);

    const [activeTab, setActiveTab] = useState<string>(esCategoriaEspecial ? "restaurante" : "");
    const [cardseleccionado, setcardseleccionado] = useState<LugarTuristico[]>([]);
    const [restaurantesCercanos, setRestaurantesCercanos] = useState<LugarTuristico[]>([]);
    const [hotelesCercanos, setHotelesCercanos] = useState<LugarTuristico[]>([]);
    const [cargandoCercanos, setCargandoCercanos] = useState<boolean>(false);

    const [renderizar, setrenderizar] = useState<boolean>(false);
    const [fotoActual, setFotoActual] = useState<number>(0);
    const [esFavorito, setEsFavorito] = useState<boolean>(false);
    const [procesandoFavorito, setProcesandoFavorito] = useState<boolean>(false);

    const textoUbicacion = useMemo(() => {
        if (!post.ciudad) return post.pais || 'Colombia';
        if (post.pais && post.ciudad.toLowerCase() === post.pais.toLowerCase()) {
            return post.ciudad;
        }
        return `${post.ciudad}, ${post.pais}`;
    }, [post.ciudad, post.pais]);

    const handleFilter = (tipo: string) => {
        setActiveTab(tipo);
        if (tipo === "restaurante") {
            setcardseleccionado(restaurantesCercanos);
        } else if (tipo === "hotel") {
            setcardseleccionado(hotelesCercanos);
        } else {
            setcardseleccionado([]);
        }
    };

    const cargarLugaresCercanos = useCallback(async () => {
        if (!esCategoriaEspecial || !post?.latitud || !post?.longitud) return;

        setCargandoCercanos(true);
        const todosLosLugares = await obtenerLugares();
        const rests: LugarTuristico[] = [];
        const hots: LugarTuristico[] = [];

        todosLosLugares.forEach((lugar) => {
            if (lugar.id === post.id) return;
            if (lugar.latitud && lugar.longitud) {
                const distKm = calcularDistanciaKm(
                    post.latitud, post.longitud,
                    lugar.latitud, lugar.longitud
                );
                if (distKm <= 3.0) {
                    if (lugar.categoria === 'restaurante') rests.push(lugar);
                    if (lugar.categoria === 'hotel') hots.push(lugar);
                }
            }
        });

        setRestaurantesCercanos(rests);
        setHotelesCercanos(hots);
        setActiveTab("restaurante");
        setcardseleccionado(rests);
        setCargandoCercanos(false);
    }, [post, esCategoriaEspecial]);

    useEffect(() => {
        if (renderizar && esCategoriaEspecial) {
            cargarLugaresCercanos();
        }
    }, [renderizar, esCategoriaEspecial, cargarLugaresCercanos]);

    useEffect(() => {
        const consultarFavorito = async () => {
            if (post?.id && usuario?.uid) {
                const fav = await verificarEsFavorito(post.id, usuario.uid);
                setEsFavorito(fav);
            }
        };
        consultarFavorito();
    }, [post?.id, usuario?.uid]);

    const handleToggleFavorito = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!usuario) {
            message.warning("Debes iniciar sesión para guardar en favoritos.");
            navigate("/login");
            return;
        }
        if (!post?.id || procesandoFavorito) return;
        setProcesandoFavorito(true);

        if (esFavorito) {
            const exito = await eliminarFavorito(post.id, usuario.uid);
            if (exito) {
                setEsFavorito(false);
                message.info("Se ha quitado el destino de tus favoritos.");
            } else message.error("No se pudo quitar de favoritos.");
        } else {
            const exito = await guardarFavorito(post.id, usuario.uid);
            if (exito) {
                setEsFavorito(true);
                message.success("¡Guardado en tus favoritos!");
            } else message.error("No se pudo guardar en favoritos.");
        }
        setProcesandoFavorito(false);
    };

    const handleNavigation = () => {
        localStorage.setItem("seleccionado", JSON.stringify(post));
        if (!post?.id) return;
        if (ventana === "lugar") {
            localStorage.setItem("origen", "lugar");
            navigate("/Mapa");
        } else {
            navigate(`/destino/${post.id}`);
        }
    };

    const imagenAleatoriaFija = useMemo(() => {
        if (post.imagenes && post.imagenes.length > 0) {
            const indice = Math.floor(Math.random() * post.imagenes.length);
            return post.imagenes[indice];
        }
        return Missingimg;
    }, [post.imagenes]);

    useEffect(() => {
        const totalImagenes = post.imagenes?.length || 0;
        if (totalImagenes > 1 && renderizar) {
            const interval = setInterval(() => {
                setFotoActual((prev) => (prev + 1) % totalImagenes);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [post.imagenes, renderizar]);

    if (sub === '1') {
        return (
            <Box
                sx={{
                    minWidth: '130px',
                    maxWidth: '130px',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    bgcolor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    '&:hover': { transform: 'translateY(-3px)' }
                }}
                onClick={handleNavigation}
            >
                <Box sx={{ position: 'relative', height: '80px', width: '100%' }}>
                    <img src={imagenAleatoriaFija} alt={post.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <Box sx={{
                        position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)',
                        px: 0.8, py: 0.2, borderRadius: '8px', display: 'flex', alignItems: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#0f172a'
                    }}>
                        <StarIcon sx={{ fontSize: 12, color: '#f59e0b', mr: 0.3 }} />
                        {post.puntuacion}
                    </Box>
                </Box>
                <Box sx={{ p: 1 }}>
                    <Typography variant="caption" fontWeight="700" sx={{ color: '#1e293b', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {post.nombre}
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <>
            <Box
                className="card-destino"
                onClick={() => setrenderizar(ventana === 'principal')}
                sx={{
                    width: '270px', minWidth: '270px', borderRadius: '20px', overflow: 'hidden', bgcolor: '#ffffff',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', cursor: 'pointer',
                    transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', m: 1,
                    '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 12px 28px rgba(0,0,0,0.12)' }
                }}
            >
                <Box sx={{ position: 'relative', height: '180px', width: '100%', overflow: 'hidden' }}>
                    <img
                        src={post.imagenes?.[0] || Missingimg}
                        alt={post.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/300x200?text=Sin+Imagen"; }}
                    />
                    <IconButton
                        size="small" onClick={handleToggleFavorito} disabled={procesandoFavorito}
                        sx={{
                            position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(255,255,255,0.85)',
                            backdropFilter: 'blur(4px)', color: esFavorito ? '#ef4444' : '#64748b', '&:hover': { bgcolor: '#ffffff' }
                        }}
                    >
                        {esFavorito ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                    </IconButton>
                    <Box sx={{
                        position: 'absolute', bottom: 10, left: 10, bgcolor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
                        color: '#fff', px: 1.2, py: 0.3, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 0.4
                    }}>
                        <LocationOnIcon sx={{ fontSize: 13, color: '#38bdf8' }} />
                        <Typography variant="caption" fontWeight="600" sx={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                            {post.pais || 'Colombia'}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexGrow: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Typography variant="subtitle1" fontWeight="800" sx={{ color: '#0f172a', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.6em' }}>
                            {post.nombre}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#fef3c7', color: '#b45309', px: 0.8, py: 0.3, borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                            <StarIcon sx={{ fontSize: 14, mr: 0.3, color: '#f59e0b' }} />
                            {post.puntuacion}
                        </Box>
                    </Stack>
                </Box>
            </Box>

            {/* 🔍 MODAL DE DETALLE ADAPTATIVO / RESPONSIVE */}
            <Modal
                open={renderizar}
                onCancel={() => setrenderizar(false)}
                footer={null}
                width="92%"
                destroyOnClose
                closeIcon={<CloseIcon sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.5)', borderRadius: '50%', p: 0.5 }} />}
                style={{ maxWidth: '480px', top: 25, margin: '0 auto', padding: 0 }}
                bodyStyle={{ padding: 0, borderRadius: '20px', overflow: 'hidden' }}
            >
                <Box
                    sx={{
                        bgcolor: '#ffffff',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        '&::-webkit-scrollbar': { width: '4px' },
                        '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: '4px' }
                    }}
                >
                    <Box sx={{ position: 'relative', height: { xs: '140px', sm: '160px' }, width: '100%', bgcolor: '#0f172a' }}>
                        <img
                            key={fotoActual}
                            src={post.imagenes && post.imagenes.length > 0 ? post.imagenes[fotoActual] : Missingimg}
                            alt={post.nombre}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.4s ease-in-out' }}
                        />
                        {post.imagenes && post.imagenes.length > 1 && (
                            <Stack direction="row" spacing={1} sx={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', bgcolor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', px: 1.2, py: 0.4, borderRadius: '10px' }}>
                                {post.imagenes.map((_, index) => (
                                    <Box key={index} onClick={() => setFotoActual(index)} sx={{ width: index === fotoActual ? 16 : 6, height: 6, borderRadius: '3px', bgcolor: index === fotoActual ? '#38bdf8' : 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all 0.3s ease' }} />
                                ))}
                            </Stack>
                        )}
                    </Box>

                    <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" fontWeight="700" color="#0284c7" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.72rem' }}>
                                {textoUbicacion}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ bgcolor: '#fef3c7', px: 1, py: 0.3, borderRadius: '8px' }}>
                                <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                                <Typography variant="subtitle2" fontWeight="800" color="#b45309" sx={{ fontSize: '0.75rem' }}>
                                    {post.puntuacion}
                                </Typography>
                            </Stack>
                        </Stack>

                        <Typography variant="h6" fontWeight="800" sx={{ color: '#0f172a', mb: 1, fontSize: { xs: '1.05rem', sm: '1.15rem' }, wordBreak: 'break-word' }}>
                            {post.nombre}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, mb: 2, fontSize: '0.82rem', wordBreak: 'break-word' }}>
                            {post.descripcion || 'Sin descripción disponible para este destino.'}
                        </Typography>

                        {esCategoriaEspecial && (
                            <>
                                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                                    <button
                                        className={`btn-pill ${activeTab === "restaurante" ? "active" : ""}`}
                                        onClick={() => handleFilter("restaurante")}
                                        style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                                    >
                                        Restaurantes <DinnerDiningIcon sx={{ ml: 0.5, fontSize: 16, color: "orange" }} />
                                    </button>

                                    <button
                                        className={`btn-pill ${activeTab === "hotel" ? "active" : ""}`}
                                        onClick={() => handleFilter("hotel")}
                                        style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                                    >
                                        Hoteles <HotelIcon sx={{ ml: 0.5, fontSize: 16, color: "red" }} />
                                    </button>
                                </Stack>

                                {cargandoCercanos ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                        <CircularProgress size={22} />
                                    </Box>
                                ) : cardseleccionado.length > 0 ? (
                                    <Stack direction="row" spacing={1.2} sx={{ overflowX: 'auto', pb: 1, mb: 2.5 }}>
                                        {cardseleccionado.map((item) => (
                                            <FeaturedPost key={item.id} post={item} ventana={ventana} sub={'1'} />
                                        ))}
                                    </Stack>
                                ) : (
                                    activeTab !== "" && (
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.5, fontStyle: 'italic', fontSize: '0.78rem' }}>
                                            No hay {activeTab === "restaurante" ? "restaurantes" : "hoteles"} registrados en un radio de 3 km 📍
                                        </Typography>
                                    )
                                )}
                            </>
                        )}

                        <button
                            className="btn-ver-mas-modal"
                            onClick={handleNavigation}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '12px',
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: '800',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                                transition: 'background-color 0.2s ease'
                            }}
                        >
                            <RemoveRedEyeIcon fontSize="small" /> Ver Más
                        </button>
                    </Box>
                </Box>
            </Modal>
        </>
    );
}