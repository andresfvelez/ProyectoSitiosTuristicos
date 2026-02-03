import React, {useCallback, useEffect, useRef, useState} from "react";
import { useNavigate } from "react-router-dom";

// Material UI Components
import {
  Box,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
  Avatar,
  Divider,
  Stack,
  Chip
} from "@mui/material";

// Icons
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import StarHalfIcon from "@mui/icons-material/StarHalf";
import DinnerDiningIcon from "@mui/icons-material/DinnerDining";
import HotelIcon from "@mui/icons-material/Hotel";
import CarRentalIcon from "@mui/icons-material/CarRental";
import WifiIcon from '@mui/icons-material/Wifi';
import PeopleIcon from '@mui/icons-material/People';
import AcUnitIcon from '@mui/icons-material/AcUnit';

// Ant Design Components
import { Button, Form } from "antd";
import {imgPerfil} from "../../Layouts/Images/imagenPerfilPrueba";
// Local Assets & Components
import BannerImg from "../../Layouts/Images/Banner.png";
import FeaturedPost from './Seccions/Cards';
import "../Pages/styles/Lugar.css";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MapaUbicacion from "./Seccions/Localizacionleaf";
import {LugarTuristico} from "../models/LugarTuristico";

const Pagina2 = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<any>();

  // Estados
  const [activeTab, setActiveTab] = useState<string>("");
  const [renderizar, setrenderizar] = useState<boolean>(false);
  const [showlocalizacion, setshowlocalizacion] = useState<boolean>(false);
  const [restaurant, setrestaurant] = useState<string>("white");
  const [hotel, sethotel] = useState<string>("white");
  const [rentaauto, setrentaauto] = useState<string>("white");
  const [info, setinfo] = useState<LugarTuristico>();
  const [cardseleccionado, setcardseleccionado] = useState<any[]>([]);
  const [stars, setstars] = useState<any[]>([]);
  const [coments, setcoments] = useState<any[]>([]);
  const [enviar, setenviar] = useState<boolean>(true);
  const [starsuser, setstarsuser] = useState<boolean[]>([false, false, false, false, false]);

  const Hotels = [
    { pais: 'Colombia', lugar: 'Guatapé', image: BannerImg, recomendado: 'US $ 150,0', minimo: 'US $ 85,00', descripcion: 'Lugar increíble', puntuacion: '3.0', coordenadas: {}, zoom: 8 },
    { pais: 'Colombia', lugar: 'Eje Cafetero', image: BannerImg, recomendado: 'US $ 100,0', minimo: 'US $ 60,00', descripcion: 'Café y naturaleza', puntuacion: '4.0', coordenadas: {}, zoom: 8 },
    { pais: 'Colombia', lugar: 'Santa Marta', image: BannerImg, recomendado: 'US $ 120,0', minimo: 'US $ 90,00', descripcion: 'Playa y sol', puntuacion: '4.5', coordenadas: {}, zoom: 8 },
  ];
  const Restaurants = [
    { pais: 'Colombia', lugar: 'Comida tai', image: BannerImg, recomendado: 'US $ 150,0', minimo: 'US $ 85,00', descripcion: 'Lugar increíble', puntuacion: '3.0', coordenadas: {}, zoom: 8 },
    { pais: 'Colombia', lugar: 'Dato', image: BannerImg, recomendado: 'US $ 100,0', minimo: 'US $ 60,00', descripcion: 'Café y naturaleza', puntuacion: '4.0', coordenadas: {}, zoom: 8 },
  ];

  const getListas = useCallback(async () => {
    let destino: LugarTuristico = JSON.parse(localStorage.getItem("seleccionado") || "{}");
    const starArr = Array(5).fill("0");

    if (destino.puntuacion !== undefined && destino.puntuacion !== null) {
      const p = Number(destino.puntuacion);

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
    setcoments([
      { usuario: "Andrés G.", puntuacion: "4.0", comentario: "Increíble lugar, la vista es insuperable.", imagenes: [imgPerfil] },
      { usuario: "Mariana L.", puntuacion: "5.0", comentario: "El mejor viaje de mi vida, muy recomendado.", imagenes: [imgPerfil] }
    ]);

    setinfo(destino);
    setstars(starArr);
    setrenderizar(true);
  }, []);

  useEffect(() => {
    getListas();
  }, [getListas]);

  const habilitarboton = () => {
    const comentario = form.getFieldValue("comentario");
    setenviar(!(comentario && comentario.length > 0));
  };

  const handleFilter = (tipo: string) => {
    setActiveTab(tipo);
    if (tipo === "restaurante") {
      setcardseleccionado(Restaurants);
      setshowlocalizacion(false);
    } else if (tipo === "hotel") {
      setcardseleccionado(Hotels);
      setshowlocalizacion(false);
    }
    else {
      setshowlocalizacion(true);
      setcardseleccionado([])
    }

  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;

      // Al desplazar exactamente el 'clientWidth', movemos una "página" completa
      // de tarjetas. El CSS Scroll Snap se encargará de centrarlas perfectamente.
      const scrollToPosition = direction === "left"
          ? scrollLeft - clientWidth
          : scrollLeft + clientWidth;

      scrollRef.current.scrollTo({
        left: scrollToPosition,
        behavior: "smooth"
      });
    }
  };
  return (
      <>
        {renderizar && (
            <Box sx={{ bgcolor: "#fdfdfd", minHeight: "100vh" }}>

              {/* BANNER PRINCIPAL */}
              <Paper
                  sx={{
                    position: "relative",
                    height: "400px",
                    color: "#fff",
                    borderRadius: "0 0 60px 60px",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundImage: `url(${BannerImg})`,
                    mb: 5
                  }}
              >

              </Paper>

              {/* CONTENIDO PRINCIPAL */}
              <Box sx={{ px: { xs: 2, md: 8 } }}>
                <Grid container spacing={5}>

                  {/* COLUMNA IZQUIERDA */}
                  <Grid item xs={12} md={7}>
                    <Typography variant="h4" fontWeight="800" gutterBottom>
                       {info?.nombre}
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" fontWeight="bold">
                        ({info?.opiniones} Opiniones)
                      </Typography>
                      <Box sx={{ color: "#4dbce9" }}>
                        {stars.map((s, i) => (
                            s === "1" ? <StarIcon key={i} /> : s === "0.5" ? <StarHalfIcon key={i} /> : <StarBorderIcon key={i} />
                        ))}
                      </Box>

                    </Stack>

                    <Typography variant="body1" color="text.secondary" textAlign="justify" sx={{ fontSize: "1.1rem", mb: 4 }}>
                      {info?.descripcion}.
                    </Typography>

                    <Stack direction="row" spacing={2} sx={{ mb: 5 }}>
                      <button
                          className={`btn-pill ${activeTab === "restaurante" ? "active" : ""}`}
                          onClick={() => handleFilter("restaurante")}
                      >
                        Restaurantes <DinnerDiningIcon sx={{ ml: 1, color: "orange" }} />
                      </button>

                      <button
                          className={`btn-pill ${activeTab === "hotel" ? "active" : ""}`}
                          onClick={() => handleFilter("hotel")}
                      >
                        Hoteles <HotelIcon sx={{ ml: 1, color: "red" }} />
                      </button>

                      <button
                          className={`btn-pill ${activeTab === "auto" ? "active" : ""}`}
                          onClick={() => handleFilter("auto")}
                      >
                        Localizacion <LocationOnIcon  sx={{ ml: 1, color: "gold" }} />
                      </button>
                    </Stack>


                    {cardseleccionado.length>0 &&
                        <div className="carousel-wrapper" >
                          <Typography variant="h6" fontWeight="800" sx={{ mb: 3 }}>Recomendados</Typography>
                          <div className="slider-container">
                            {/* Flecha Izquierda */}
                            <button className="nav-btn left" onClick={() => scroll("left")}>
                              <ArrowBackIosIcon/>
                            </button>

                            <div className="cards-track" ref={scrollRef}>
                              {cardseleccionado.map((post, i) => (
                                  <FeaturedPost key={i} ventana={'lugar'} post={post} sub='0' />
                              ))}
                            </div>
                            <button className="nav-btn right" onClick={() => scroll("right")}>
                              <ArrowForwardIosIcon/>
                            </button>
                          </div>
                        </div>
                    }
                    {showlocalizacion &&<div style={{ padding: '32px' }}>
                      <h2>Parque Nacional Natural Tayrona</h2>

                      <MapaUbicacion
                          lat={info?.latitud || 0}
                          lng={info?.longitud || 0}
                          nombre="Parque Tayrona"
                      />
                    </div>}


                  </Grid>

                  {/* COLUMNA DERECHA (SIDEBAR) */}
                  <Grid item xs={12} md={5}>
                    <Paper sx={{ borderRadius: "35px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.06)", border: "1px solid #eee" }}>
                      <Box sx={{ height: "220px", overflow: "hidden" }}>
                        <img src={BannerImg} alt="side" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </Box>
                      <Box sx={{ p: 4 }}>
                        <Typography variant="overline" color="primary" fontWeight="bold">{info?.pais}</Typography>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                          <Typography variant="h5" fontWeight="900">Tour de Aventura</Typography>
                          <Chip label="4.8" icon={<StarIcon style={{ color: 'white' }} />} sx={{ bgcolor: "#4dbce9", color: "white", fontWeight: "bold" }} />
                        </Stack>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Lo que incluye:</Typography>
                        <Stack direction="row" spacing={3} sx={{ mb: 3, color: "#666" }}>
                          <Box sx={{ textAlign: 'center' }}><WifiIcon /><Typography variant="caption" display="block">Wi-Fi</Typography></Box>
                          <Box sx={{ textAlign: 'center' }}><PeopleIcon /><Typography variant="caption" display="block">Guía</Typography></Box>
                          <Box sx={{ textAlign: 'center' }}><AcUnitIcon /><Typography variant="caption" display="block">Aire</Typography></Box>
                        </Stack>
                        <button className="btn-ver-mas-grande" style={{ width: '100%', marginTop: '30px' }}>
                          Reservar Ahora
                        </button>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                {/* SECCIÓN COMENTARIOS */}
                <Box sx={{ mt: 10, mb: 5 }}>
                  <Typography variant="h4" fontWeight="800" sx={{ mb: 4 }}>Comentarios</Typography>
                  <Grid container spacing={4}>
                    <Grid item xs={12} md={5}>
                      <Paper sx={{ p: 4, borderRadius: "25px", border: "1px solid #eee" }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>Deja tu opinión</Typography>
                        <Stack direction="row" sx={{ mb: 2 }}>
                          {starsuser.map((active, i) => (
                              <IconButton key={i} onClick={() => {
                                let newStars = [...starsuser];
                                for(let j=0; j<=i; j++) newStars[j] = true;
                                for(let j=i+1; j<5; j++) newStars[j] = false;
                                setstarsuser(newStars);
                              }}>
                                {active ? <StarIcon color="primary" /> : <StarBorderIcon color="primary" />}
                              </IconButton>
                          ))}
                        </Stack>
                        <Form form={form} onValuesChange={habilitarboton}>
                          <Form.Item name="comentario">
                            <TextField fullWidth multiline rows={4} placeholder="Cuéntanos tu experiencia..." />
                          </Form.Item>
                          <Button
                              type="primary"
                              size="large"
                              block
                              disabled={enviar}
                              style={{ borderRadius: "10px", height: "50px", fontWeight: "bold" }}
                          >
                            Enviar Comentario
                          </Button>
                        </Form>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={7}>
                      <Stack spacing={3}>
                        {coments.map((c, i) => (
                            <Paper key={i} sx={{ p: 3, borderRadius: "20px", border: "1px solid #f0f0f0" }}>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar src={(c.imagenes && c.imagenes.length > 0) ? `data:image/png;base64,${c.imagenes}` : undefined} sx={{ bgcolor: "#4dbce9" }}>
                                  {c.usuario && c.usuario[0]}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Stack direction="row" justifyContent="space-between">
                                    <Typography fontWeight="bold">{c.usuario}</Typography>
                                    <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                                      {c.puntuacion} <StarIcon fontSize="inherit" />
                                    </Typography>
                                  </Stack>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{c.comentario}</Typography>
                                </Box>
                              </Stack>
                            </Paper>
                        ))}
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </Box>
        )}
      </>
  );
};

export default Pagina2;