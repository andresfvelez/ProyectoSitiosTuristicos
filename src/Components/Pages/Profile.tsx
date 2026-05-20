import React, {FunctionComponent, useEffect, useRef, useState} from "react";
import {
  Box, Grid, Paper, Typography, TextField, Button, Avatar, InputAdornment
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import FavoriteIcon from '@mui/icons-material/Favorite';
import './styles/Profile.css';
import FeaturedPost from "./Seccions/Cards";
import {imgPerfil} from "../../Layouts/Images/imagenPerfilPrueba";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import {obtenerImagenesPorDestino, obtenerLugares} from "../../services/lugaresService";
import {LugarTuristico} from "../models/LugarTuristico";
import SelectorImagenes from "./Seccions/SelectorImages";

const Profile: FunctionComponent = () => {
  // Tu data Base64 para pruebas
  const imgB64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFgAAABSCAYAAADQDhNS...";

  const trips = [
    { name: "Guatape", country: "Colombia", rating: "4.5", price: "US $ 150,00", from: "From US $ 85,00", img: imgB64 },
    { name: "Eje Cafetero", country: "Colombia", rating: "5.0", price: "US $ 100,00", from: "From US $ 60,00", img: imgB64 },
    { name: "Cartagena", country: "Colombia", rating: "4.3", price: "US $ 180,00", from: "From US $ 100,00", img: imgB64 }
  ];

  const [lugares, setLugares] = useState<LugarTuristico[]>([]);
  const [fotoPerfil, setFotoPerfil] = useState<(File | null)[]>([]);
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
  useEffect(() => {

    const cargarTodo = async () => {
      // 1. Obtener la lista base de lugares
      const listaLugares = await obtenerLugares();

      const lugaresConFotos = await Promise.all(
          listaLugares.map(async (lugar) => {
            const fotos = await obtenerImagenesPorDestino(lugar.id!);
            return {
              ...lugar,
              imagenes: fotos // Seteamos el array de strings Base64
            };
          })
      );
      console.log(lugaresConFotos)

      setLugares(lugaresConFotos);
    };

    cargarTodo();


  }, []);
  return (
      <Box className="profile-container">
        {/* 1. SECCIÓN SUPERIOR: TARJETA DE PERFIL */}
        <Paper elevation={0} className="profile-card">
          {/* Avatar superpuesto */}
          <Avatar
              src={`data:image/png;base64,${imgPerfil}`}
              className="profile-avatar"
              sx={{ width: 120, height: 120, border: '5px solid white' }}
          />

          <SelectorImagenes
              esPerfil={true}
              label="Foto de Perfil"
              onFilesChange={(files) => setFotoPerfil(files)}
          />


          <Grid container spacing={3} sx={{ mt: 5 }}>
            <Grid item xs={12} md={6}>
              <label className="input-label">Nombre Completo:</label>
              <TextField fullWidth placeholder="Julian Gómez Rojas" variant="outlined" className="pill-input" />
            </Grid>
            <Grid item xs={12} md={6}>
              <label className="input-label">Países:</label>
              <TextField
                  fullWidth placeholder="Colombia" className="pill-input"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">🇨🇴</InputAdornment>,
                  }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <label className="input-label">Correo Electronico:</label>
              <TextField fullWidth placeholder="juliangr@gmail.com" className="pill-input" />
            </Grid>
            <Grid item xs={12} md={6}>
              <label className="input-label">Puntos:</label>
              <TextField fullWidth placeholder="3212" className="pill-input" />
            </Grid>
            <Grid item xs={12} md={6}>
              <label className="input-label">Telefono:</label>
              <TextField
                  fullWidth placeholder="+57 311 351 4732" className="pill-input"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">🇨🇴</InputAdornment>,
                  }}
              />
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
              <Button
                  variant="contained"
                  className="update-button"
                  endIcon={<EditIcon />}
              >
                Actualizar Información
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* 2. SECCIÓN INFERIOR: LAST TRIPS */}
        <Typography variant="h5" fontWeight="bold" sx={{ mt: 6, mb: 3 }}>Last Trips</Typography>

        <Grid container spacing={3}>
          <div className="carousel-wrapper">
            <h2 className="section-title">Destinos Populares</h2>

            {lugares.length>0 && (
                <div className="slider-container">
                  <button className="nav-btn left" onClick={() => scroll("left")}>
                    <ArrowBackIosIcon/>
                  </button>
                  <div className="cards-track" ref={scrollRef}>
                    {lugares.map((post, index) => (
                        <FeaturedPost key={index} post={post} ventana="principal" sub="0"/>
                    ))}
                  </div>
                  <button className="nav-btn right" onClick={() => scroll("right")}>
                    <ArrowForwardIosIcon/>
                  </button>
                </div>
            )
            }

          </div>
        </Grid>
      </Box>
  );
};

export default Profile;