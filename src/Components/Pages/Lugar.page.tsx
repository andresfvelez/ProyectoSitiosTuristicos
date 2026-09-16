import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Material UI Components
import {
  Box,
  Grid,
  IconButton,
  Paper,
  Typography,
  Divider,
  Stack,
  Chip,
  CircularProgress
} from "@mui/material";

import {
  obtenerLugarPorId,
  obtenerLugares,
  agregarOpinionLugar,
  reportarLugar
} from "../../services/lugaresService";

// Icons
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import StarHalfIcon from "@mui/icons-material/StarHalf";
import DinnerDiningIcon from "@mui/icons-material/DinnerDining";
import HotelIcon from "@mui/icons-material/Hotel";
import PetsIcon from '@mui/icons-material/Pets';
import AccessibleIcon from '@mui/icons-material/Accessible';
import LuggageIcon from '@mui/icons-material/Luggage';
import VerifiedIcon from '@mui/icons-material/Verified';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LandscapeIcon from '@mui/icons-material/Landscape';
import FlagIcon from '@mui/icons-material/Flag';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

// Ant Design Components
import { Button, Form, message, Modal, Popconfirm, Input } from "antd";

// Local Assets & Components
import BannerImg from "../../Layouts/Images/Banner.png";
import FeaturedPost from './Seccions/Cards';
import "../Pages/styles/Lugar.css";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MapaUbicacion from "./Seccions/Localizacionleaf";
import { LugarTuristico, Opinion } from "../models/LugarTuristico";
import SeccionComentarios from "./Seccions/Comments";
import { obtenerLabelFormateado } from "../models/OpcionesDestinos";
import { calcularDistanciaKm } from "../../services/ValidacionLugar";
import { useAuth } from "../../auth/AuthProvider";
import { eliminarFavorito, guardarFavorito, verificarEsFavorito } from "../../services/usuariosService";

const Pagina2 = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm<any>();
  const { usuario } = useAuth();

  // Estados generales
  const [activeTab, setActiveTab] = useState<string>("auto");
  const [showlocalizacion, setshowlocalizacion] = useState<boolean>(true);
  const [cargando, setCargando] = useState<boolean>(true);
  const [restaurantesCercanos, setRestaurantesCercanos] = useState<LugarTuristico[]>([]);
  const [hotelesCercanos, setHotelesCercanos] = useState<LugarTuristico[]>([]);
  const [info, setinfo] = useState<LugarTuristico | null>(null);
  const [cardseleccionado, setcardseleccionado] = useState<any[]>([]);

  // 🚩 Estados para el Reporte
  const [modalReporte, setModalReporte] = useState<boolean>(false);
  const [motivoReporte, setMotivoReporte] = useState<string>("");
  const [enviandoReporte, setEnviandoReporte] = useState<boolean>(false);

  // ❤️ Estados para Favoritos
  const [esFavorito, setEsFavorito] = useState<boolean>(false);
  const [procesandoFavorito, setProcesandoFavorito] = useState<boolean>(false);

  const handleAbrirModalReporte = () => {
    if (!usuario) {
      message.warning("Debes iniciar sesión para reportar un sitio.");
      navigate("/login");
      return;
    }
    setModalReporte(true);
  };

  const handleConfirmarReporte = async () => {
    if (!motivoReporte.trim()) {
      message.warning("Por favor ingresa el motivo del reporte.");
      return;
    }

    if (!info?.id || !usuario) return;


    setEnviandoReporte(true);
    const exito = await reportarLugar(info.id, usuario.uid, motivoReporte);
    setEnviandoReporte(false);

    if (exito) {
      message.success("El reporte ha sido enviado. Los administradores lo revisarán pronto.");
      setModalReporte(false);
      setMotivoReporte("");
    } else {
      message.error("Ocurrió un error al enviar el reporte.");
    }
  };

  const handleToggleFavorito = async () => {
    if (!usuario) {
      message.warning("Debes iniciar sesión para guardar en favoritos.");
      navigate("/login");
      return;
    }

    if (!info?.id || procesandoFavorito) return;

    setProcesandoFavorito(true);

    if (esFavorito) {
      const exito = await eliminarFavorito(info.id, usuario.uid);
      if (exito) {
        setEsFavorito(false);
        message.info("Se ha quitado el destino de tus favoritos.");
      } else {
        message.error("No se pudo quitar de favoritos.");
      }
    } else {
      const exito = await guardarFavorito(info.id, usuario.uid);
      if (exito) {
        setEsFavorito(true);
        message.success("¡Guardado en tus favoritos!");
      } else {
        message.error("No se pudo guardar en favoritos.");
      }
    }

    setProcesandoFavorito(false);
  };

  const cargarLugar = useCallback(async () => {
    if (!id) {
      console.error("No se proporcionó un ID en la URL");
      setCargando(false);
      return;
    }

    setCargando(true);
    const destino = await obtenerLugarPorId(id);
    setinfo(destino);

    if (destino && usuario?.uid && id) {
      const fav = await verificarEsFavorito(id, usuario.uid);
      setEsFavorito(fav);
    }

    if (destino && destino.latitud && destino.longitud) {
      const todosLosLugares = await obtenerLugares();

      const rests: LugarTuristico[] = [];
      const hots: LugarTuristico[] = [];

      todosLosLugares.forEach((lugar) => {
        if (lugar.id === destino.id) return;

        if (lugar.latitud && lugar.longitud) {
          const distKm = calcularDistanciaKm(
              destino.latitud, destino.longitud,
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
    }

    setCargando(false);
  }, [id, usuario?.uid]);

  useEffect(() => {
    cargarLugar();
  }, [cargarLugar]);

  const stars = useMemo(() => {
    const starArr = Array(5).fill("0");
    if (info?.puntuacion !== undefined && info?.puntuacion !== null) {
      const p = Number(info.puntuacion);
      if (!isNaN(p)) {
        const fullStars = Math.floor(p);
        const hasHalfStar = p - fullStars >= 0.5;

        for (let i = 0; i < fullStars && i < 5; i++) {
          starArr[i] = "1";
        }
        if (hasHalfStar && fullStars < 5) {
          starArr[fullStars] = "0.5";
        }
      }
    }
    return starArr;
  }, [info?.puntuacion]);

  const listaOpiniones: Opinion[] = useMemo(() => {
    return info?.opiniones && Array.isArray(info.opiniones) ? info.opiniones : [];
  }, [info?.opiniones]);

  const handleFilter = (tipo: string) => {
    setActiveTab(tipo);
    if (tipo === "restaurante") {
      setcardseleccionado(restaurantesCercanos);
      setshowlocalizacion(false);
    } else if (tipo === "hotel") {
      setcardseleccionado(hotelesCercanos);
      setshowlocalizacion(false);
    } else {
      setshowlocalizacion(true);
      setcardseleccionado([]);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress size={60} sx={{ color: "#4dbce9" }} />
        </Box>
    );
  }

  if (!info) {
    return (
        <Box sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="h5">El lugar solicitado no existe.</Typography>
        </Box>
    );
  }

  return (
      <>
        <Box sx={{ bgcolor: "#fdfdfd", minHeight: "100vh", overflowX: "hidden" }}>

          {/* BANNER PRINCIPAL RESPONSIVE */}
          <Paper
              sx={{
                position: "relative",
                height: { xs: "220px", sm: "320px", md: "400px" },
                color: "#fff",
                borderRadius: { xs: "0 0 28px 28px", md: "0 0 60px 60px" },
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundImage: info?.imagenes && info?.imagenes[0]
                    ? `url(${info?.imagenes[0].startsWith('data:')
                        ? info?.imagenes[0]
                        : `data:image/jpeg;base64,${info?.imagenes[0]}`})`
                    : 'url(https://via.placeholder.com/800x400?text=Cargando+Imagen...)',
                mb: { xs: 3, md: 5 },
                backgroundColor: "rgba(0,0,0,0.3)",
                backgroundBlendMode: "overlay"
              }}
          />

          {/* CONTENIDO PRINCIPAL */}
          <Box sx={{ px: { xs: 2, sm: 4, md: 8 } }}>
            <Grid container spacing={{ xs: 3, md: 5 }}>

              {/* COLUMNA IZQUIERDA */}
              <Grid item xs={12} md={7}>

                {/* ENCABEZADO */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  <Typography
                      variant="h4"
                      fontWeight="800"
                      sx={{
                        fontSize: { xs: "1.35rem", sm: "1.8rem", md: "2.125rem" },
                        wordBreak: "break-word"
                      }}
                  >
                    {info?.nombre}
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                    {usuario && (
                        <IconButton
                            onClick={handleToggleFavorito}
                            disabled={procesandoFavorito}
                            title={esFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
                            sx={{
                              color: esFavorito ? "#ef4444" : "#94a3b8",
                              border: esFavorito ? "1px solid #fecaca" : "1px solid #cbd5e1",
                              bgcolor: esFavorito ? "#fef2f2" : "#ffffff",
                              "&:hover": { bgcolor: esFavorito ? "#fee2e2" : "#f1f5f9" }
                            }}
                        >
                          {esFavorito ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                        </IconButton>
                    )}

                    {usuario && (
                        <IconButton
                            onClick={handleAbrirModalReporte}
                            title="Reportar sitio"
                            sx={{
                              color: "#ef4444",
                              border: "1px solid #fecaca",
                              bgcolor: "#fef2f2",
                              "&:hover": { bgcolor: "#fee2e2" }
                            }}
                        >
                          <FlagIcon fontSize="small" />
                        </IconButton>
                    )}
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight="bold">
                    ({listaOpiniones.length} Opiniones)
                  </Typography>
                  <Box sx={{ color: "#4dbce9", display: "flex" }}>
                    {stars.map((s: string, i: number) => (
                        s === "1" ? <StarIcon key={i} fontSize="small" /> : s === "0.5" ? <StarHalfIcon key={i} fontSize="small" /> : <StarBorderIcon key={i} fontSize="small" />
                    ))}
                  </Box>
                </Stack>

                <Typography variant="body1" color="text.secondary" textAlign="justify" sx={{ fontSize: { xs: "0.95rem", md: "1.1rem" }, mb: 3 }}>
                  {info?.descripcion}.
                </Typography>

                {/* ETIQUETAS */}
                <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {info?.petFriendly && (
                      <Chip
                          icon={<PetsIcon style={{ fontSize: 16, color: "#15803d" }} />}
                          label="Pet Friendly"
                          size="small"
                          sx={{ bgcolor: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", fontWeight: "bold" }}
                      />
                  )}

                  {info?.accesibleSillaRuedas && (
                      <Chip
                          icon={<AccessibleIcon style={{ fontSize: 16, color: "#0369a1" }} />}
                          label="Acceso Silla de Ruedas"
                          size="small"
                          sx={{ bgcolor: "#f0f9ff", color: "#075985", border: "1px solid #bae6fd", fontWeight: "bold" }}
                      />
                  )}

                  {info?.tagsEspeciales && info.tagsEspeciales.map((tag, idx) => (
                      <Chip
                          key={`tag-${idx}`}
                          label={obtenerLabelFormateado(tag)}
                          size="small"
                          sx={{ bgcolor: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", fontWeight: "bold" }}
                      />
                  ))}

                  {info?.servicios && info.servicios.map((serv, idx) => (
                      <Chip
                          key={`serv-${idx}`}
                          label={obtenerLabelFormateado(serv)}
                          size="small"
                          sx={{ bgcolor: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", fontWeight: "bold" }}
                      />
                  ))}
                </Box>

                {/* QUÉ SE RECOMIENDA LLEVAR */}
                {info?.queLlevar && (
                    <Box
                        sx={{
                          mb: 3,
                          p: { xs: 2, md: 2.5 },
                          bgcolor: "#f8fafc",
                          borderRadius: "16px",
                          border: "1px solid #e2e8f0",
                          borderLeft: "4px solid #0ea5e9"
                        }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <LuggageIcon sx={{ color: "#0ea5e9" }} />
                        <Typography variant="subtitle1" fontWeight="800" color="#0f172a">
                          ¿Qué se recomienda llevar?
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="#475569" sx={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>
                        {info.queLlevar}
                      </Typography>
                    </Box>
                )}

                {/* BOTONES CON MULTI-FILA AUTOMÁTICA Y ESPACIADO FLEXIBLE EN MÓVIL */}
                <Stack
                    direction="row"
                    sx={{
                      mb: 4,
                      gap: { xs: 1, sm: 2 },
                      flexWrap: "wrap"
                    }}
                >
                  {(info?.categoria === 'aventura' || info?.categoria === 'Área Natural') && (
                      <>
                        <button
                            className={`btn-pill ${activeTab === "restaurante" ? "active" : ""}`}
                            onClick={() => handleFilter("restaurante")}
                            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                        >
                          Restaurantes <DinnerDiningIcon sx={{ ml: 0.5, fontSize: 18, color: "orange" }} />
                        </button>

                        <button
                            className={`btn-pill ${activeTab === "hotel" ? "active" : ""}`}
                            onClick={() => handleFilter("hotel")}
                            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                        >
                          Hoteles <HotelIcon sx={{ ml: 0.5, fontSize: 18, color: "red" }} />
                        </button>
                      </>
                  )}

                  <button
                      className={`btn-pill ${activeTab === "auto" ? "active" : ""}`}
                      onClick={() => handleFilter("auto")}
                      style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                  >
                    Localizacion <LocationOnIcon sx={{ ml: 0.5, fontSize: 18, color: "gold" }} />
                  </button>
                </Stack>

                {cardseleccionado.length > 0 && (
                    <div className="carousel-wrapper">
                      <Typography variant="h6" fontWeight="800" sx={{ mb: 2, fontSize: "1.1rem" }}>
                        {activeTab === "restaurante" ? "Restaurantes Cercanos (Máx 3 km)" : "Hoteles Cercanos (Máx 3 km)"}
                      </Typography>
                      <div className="slider-container">
                        <button className="nav-btn left" onClick={() => scroll("left")}>
                          <ArrowBackIosIcon fontSize="small" />
                        </button>

                        <div className="cards-track" ref={scrollRef}>
                          {cardseleccionado.map((post, i) => (
                              <FeaturedPost key={i} ventana={'lugar'} post={post} sub='0' />
                          ))}
                        </div>

                        <button className="nav-btn right" onClick={() => scroll("right")}>
                          <ArrowForwardIosIcon fontSize="small" />
                        </button>
                      </div>
                    </div>
                )}

                {(activeTab === "restaurante" || activeTab === "hotel") && cardseleccionado.length === 0 && (
                    <Box
                        sx={{
                          p: { xs: 2.5, md: 4 },
                          mb: 4,
                          textAlign: "center",
                          bgcolor: "#f8fafc",
                          borderRadius: "20px",
                          border: "2px dashed #cbd5e1",
                        }}
                    >
                      <Typography variant="subtitle1" fontWeight="800" color="#334155" gutterBottom sx={{ fontSize: "0.95rem" }}>
                        No hay {activeTab === "restaurante" ? "restaurantes" : "hoteles"} registrados en un radio de 3 km 📍
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem" }}>
                        Explora otros sitios de la plataforma o revisa la pestaña de localización en el mapa.
                      </Typography>
                    </Box>
                )}

                {/* CONTENEDOR DEL MAPA ADAPTADO PARA MÓVILES */}
                {showlocalizacion && (
                    <Box sx={{ py: { xs: 1, md: 3 }, width: "100%", overflow: "hidden" }}>
                      <Typography variant="h6" fontWeight="800" sx={{ mb: 1.5, fontSize: "1.1rem" }}>
                        {info?.nombre}
                      </Typography>
                      <MapaUbicacion
                          lat={info?.latitud || 0}
                          lng={info?.longitud || 0}
                          nombre={info?.nombre || ""}
                      />
                    </Box>
                )}

              </Grid>

              {/* COLUMNA DERECHA (SIDEBAR) */}
              <Grid item xs={12} md={5}>
                <Paper sx={{ borderRadius: "24px", overflow: "hidden", boxShadow: "0 12px 30px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>

                  <Box sx={{ height: { xs: "140px", md: "180px" }, overflow: "hidden" }}>
                    <img
                        src={info?.imagenes && info.imagenes.length > 0
                            ? (info.imagenes[0].startsWith('data:') ? info.imagenes[0] : `data:image/jpeg;base64,${info.imagenes[0]}`)
                            : BannerImg}
                        alt="sidebar-img"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>

                  <Box sx={{ p: { xs: 2.5, md: 4 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="overline" color="primary" fontWeight="900" sx={{ fontSize: "0.8rem" }}>
                        {info?.categoria?.toUpperCase() || "DESTINO"}
                      </Typography>
                      {info?.puntuacion ? (
                          <Chip label={info.puntuacion} icon={<StarIcon style={{ color: 'white', fontSize: 14 }} />} sx={{ bgcolor: "#f59e0b", color: "white", fontWeight: "bold" }} size="small" />
                      ) : null}
                    </Stack>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">
                        {info?.categoria === "hotel" ? "Precio Promedio Noche" : info?.categoria === "restaurante" ? "Precio Promedio Plato" : "Presupuesto Sugerido"}
                      </Typography>
                      <Typography variant="h5" fontWeight="900" color="#0ea5e9">
                        ${Number(info?.minimo || 0).toLocaleString("es-CO")}{" "}
                        <Typography component="span" variant="body2" fontWeight="bold">COP</Typography>
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2.5 }} />

                    {(info?.rnt || info?.nit || info?.unescoId) && (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="#334155">
                            Verificación Oficial:
                          </Typography>
                          <Stack spacing={1}>
                            {info?.rnt && (
                                <Chip icon={<VerifiedIcon />} label={`RNT: ${info.rnt}`} size="small" sx={{ bgcolor: "#d1fae5", color: "#065f46", fontWeight: "bold", justifyContent: "flex-start", px: 1 }} />
                            )}
                            {info?.nit && (
                                <Chip icon={<VerifiedIcon />} label={`NIT: ${info.nit}`} size="small" sx={{ bgcolor: "#d1fae5", color: "#065f46", fontWeight: "bold", justifyContent: "flex-start", px: 1 }} />
                            )}
                            {info?.unescoId && (
                                <Chip icon={<VerifiedIcon />} label={`UNESCO: ${info.unescoId}`} size="small" sx={{ bgcolor: "#e0f2fe", color: "#075985", fontWeight: "bold", justifyContent: "flex-start", px: 1 }} />
                            )}
                          </Stack>
                        </Box>
                    )}

                    {info?.categoria === 'aventura' && info?.dificultad && (
                        <Box sx={{ mb: 3, p: 1.8, bgcolor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <LandscapeIcon sx={{ color: "#64748b" }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block">Nivel de Dificultad</Typography>
                              <Typography variant="body2" fontWeight="900" color="#0f172a">{info.dificultad}</Typography>
                            </Box>
                          </Stack>
                        </Box>
                    )}

                    {info?.contactoWhatsapp && (
                        <Button
                            type="primary"
                            block
                            size="large"
                            icon={<WhatsAppIcon />}
                            style={{ backgroundColor: '#22c55e', height: '46px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 'bold' }}
                            onClick={() => {
                              const whatsapp = info.contactoWhatsapp;
                              if (whatsapp) {
                                window.open(`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`, '_blank');
                              }
                            }}
                        >
                          Contactar / Reservar
                        </Button>
                    )}

                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* SECCIÓN COMENTARIOS */}
            <SeccionComentarios
                comentariosIniciales={listaOpiniones}
                usuarioLogueado={usuario}
                onEnviarComentario={async ({ puntuacion, comentario }) => {
                  if (!info?.id || !usuario) return;

                  const nuevaOpinion = {
                    lugarId: info.id,
                    usuarioId: usuario.uid,
                    usuario: usuario.displayName || usuario.email?.split("@")[0] || "Viajero",
                    comentario: comentario,
                    puntuacion: puntuacion,
                    fuente: "plataforma",
                    fecha: new Date().toLocaleDateString("es-CO")
                  };

                  const exito = await agregarOpinionLugar(info.id, nuevaOpinion);
                  if (exito) {
                    message.success("¡Gracias por compartir tu opinión!");
                    cargarLugar();
                  } else {
                    message.error("Ocurrió un problema al guardar tu opinión.");
                  }
                }}
            />
          </Box>
        </Box>

        {/* 🚩 MODAL DE REPORTE */}
        <Modal
            title={
              <Stack direction="row" alignItems="center" spacing={1}>
                <FlagIcon sx={{ color: "#ef4444" }} />
                <Typography variant="h6" fontWeight="800" sx={{ fontSize: "1.05rem" }}>Reportar este sitio</Typography>
              </Stack>
            }
            open={modalReporte}
            onCancel={() => {
              setModalReporte(false);
              setMotivoReporte("");
            }}
            footer={null}
            width="90%"
            style={{ maxWidth: "480px" }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1, fontSize: "0.85rem" }}>
            ¿Hay algo engañoso o inapropiado en este destino? Escribe el motivo para que el equipo de moderadores lo revise.
          </Typography>

          <Input.TextArea
              rows={4}
              value={motivoReporte}
              onChange={(e) => setMotivoReporte(e.target.value)}
              placeholder="Ejemplo: La información de ubicación es errónea o el lugar no cumple con los servicios ofrecidos..."
              style={{ borderRadius: "12px", marginBottom: "20px" }}
          />

          <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
            <Button onClick={() => setModalReporte(false)}>
              Cancelar
            </Button>

            <Popconfirm
                title="¿Confirmar envío del reporte?"
                description="Se enviará la notificación al panel de administración."
                onConfirm={handleConfirmarReporte}
                okText="Sí, reportar"
                cancelText="No, revisar"
                okButtonProps={{ danger: true, loading: enviandoReporte }}
                disabled={!motivoReporte.trim()}
            >
              <Button type="primary" danger disabled={!motivoReporte.trim()}>
                Enviar Reporte
              </Button>
            </Popconfirm>
          </Stack>
        </Modal>
      </>
  );
};

export default Pagina2;