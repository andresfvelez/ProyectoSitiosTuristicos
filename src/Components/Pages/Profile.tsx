import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Grid, Paper, Typography, TextField, Button, InputAdornment,
  CircularProgress, Autocomplete, Tabs, Tab, MenuItem, Checkbox, ListItemText, Chip, Alert, Stack
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import PersonIcon from '@mui/icons-material/Person';
import TuneIcon from '@mui/icons-material/Tune';
import FavoriteIcon from '@mui/icons-material/Favorite';
import './styles/Profile.css';
import FeaturedPost from "./Seccions/Cards";
import {
  obtenerImagenesPorDestino,
  obtenerLugares,
  obtenerFavoritosPorUsuario
} from "../../services/lugaresService";
import {
  obtenerPerfilUsuario,
  obtenerFotoPerfilUsuario,
  actualizarPerfilUsuario,
  guardarFotoPerfilUsuario,
  eliminarFotoPerfilUsuario
} from "../../services/usuariosService";
import { LugarTuristico } from "../models/LugarTuristico";
import SelectorImagenes from "./Seccions/SelectorImages";
import { auth } from "../../firebase/firebaseConfig";
import { mostrarAlerta } from "../../Layouts/Utils/alertUtils";
import { DEFAULT_AVATAR } from "../../Layouts/Images/defaulAvatar";
import { obtenerCiudadesColombia } from "../../services/ApiServices";
import { PREGUNTAS_PERFIL } from "../models/PreguntasPerfil";

const normalizarTexto = (texto: string) =>
    texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ♿ Opción exclusiva para el perfil
const OPCION_ACCESIBILIDAD_DISCAPACIDAD = {
  label: '♿ Acceso para Discapacitados / Silla de Ruedas',
  value: 'accesible_silla_ruedas'
};

export const Profile: FunctionComponent = () => {
  const navigate = useNavigate();
  const [favoritos, setFavoritos] = useState<LugarTuristico[]>([]);
  const [opcionesCiudades, setOpcionesCiudades] = useState<{ label: string; value: string }[]>([]);
  const [cargandoCiudades, setCargandoCiudades] = useState<boolean>(false);

  const [tabSubMenu, setTabSubMenu] = useState<number>(0);

  const [fotoPerfil, setFotoPerfil] = useState<File[]>([]);
  const [imagenPerfilBase64, setImagenPerfilBase64] = useState<string>(DEFAULT_AVATAR);
  const [fotoDocId, setFotoDocId] = useState<string | null>(null);
  const [fotoBorrada, setFotoBorrada] = useState<boolean>(false);

  // Variable de control de obligatoriedad
  const [preferenciasObligatorias] = useState<boolean>(true);

  // Estados de Información Personal
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [ciudad, setCiudad] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [fechaNacimiento, setFechaNacimiento] = useState<string>('');
  const [biografia, setBiografia] = useState<string>('');
  const [puntos, setPuntos] = useState<number>(0);

  // Estado para Preferencias de la Encuesta
  const [preferencias, setPreferencias] = useState<Record<string, any>>({
    clima: '',
    entorno: '',
    rangoPresupuesto: '',
    tipoAcceso: '',
    ritmo: '',
    companiaIdeal: []
  });

  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);

  // Referencias para carruseles independientes
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollFavRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right', ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollToPosition = direction === "left"
          ? scrollLeft - clientWidth
          : scrollLeft + clientWidth;

      ref.current.scrollTo({
        left: scrollToPosition,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    const fetchCiudades = async () => {
      setCargandoCiudades(true);
      try {
        const ciudades = await obtenerCiudadesColombia();
        setOpcionesCiudades(ciudades);
      } catch (error) {
        console.error("Error al obtener las ciudades:", error);
      } finally {
        setCargandoCiudades(false);
      }
    };

    fetchCiudades();
  }, []);

  useEffect(() => {
    const cargarDatosPerfil = async () => {
      setCargando(true);
      try {
        const usuarioActual = auth.currentUser;
        if (!usuarioActual) return;

        // 1. Datos de perfil
        const dataUsuario = await obtenerPerfilUsuario(usuarioActual.uid);
        if (dataUsuario) {
          setFullName(dataUsuario.fullName || '');
          setEmail(dataUsuario.email || usuarioActual.email || '');
          setCiudad(dataUsuario.ciudad || '');
          setTelefono(dataUsuario.telefono || '');
          setFechaNacimiento(dataUsuario.fechaNacimiento || '');
          setBiografia(dataUsuario.biografia || '');
          setPuntos(dataUsuario.puntos || 0);

          setPreferencias({
            clima: dataUsuario.clima || '',
            entorno: dataUsuario.entorno || '',
            rangoPresupuesto: dataUsuario.rangoPresupuesto || '',
            tipoAcceso: dataUsuario.tipoAcceso || '',
            ritmo: dataUsuario.ritmo || '',
            companiaIdeal: dataUsuario.companiaIdeal || []
          });
        } else {
          setEmail(usuarioActual.email || '');
        }

        // 2. Foto de perfil
        const fotoData = await obtenerFotoPerfilUsuario(usuarioActual.uid);
        if (fotoData) {
          setFotoDocId(fotoData.id);
          setImagenPerfilBase64(fotoData.base64);
        } else {
          setImagenPerfilBase64(DEFAULT_AVATAR);
        }

        // 3. Carga de Favoritos
        const listaFavs = await obtenerFavoritosPorUsuario(usuarioActual.uid);
        const favsConFotos = await Promise.all(
            listaFavs.map(async (lugar) => {
              const fotos = await obtenerImagenesPorDestino(lugar.id!);
              return { ...lugar, imagenes: fotos };
            })
        );
        setFavoritos(favsConFotos);

      } catch (error) {
        console.error("Error cargando perfil:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosPerfil();
  }, []);

  const estaPreferenciasCompletas = PREGUNTAS_PERFIL.every((pregunta) => {
    const valor = preferencias[pregunta.id];
    if (pregunta.esMultiple) {
      return Array.isArray(valor) && valor.length > 0;
    }
    return valor !== undefined && valor !== null && String(valor).trim() !== '';
  });

  const botonDeshabilitado = guardando || (preferenciasObligatorias && !estaPreferenciasCompletas);

  const handleCambioPreferencia = (id: string, valor: any) => {
    setPreferencias(prev => ({
      ...prev,
      [id]: valor
    }));
  };

  const handleActualizarInformacion = async () => {
    const usuarioActual = auth.currentUser;
    if (!usuarioActual) {
      mostrarAlerta({
        title: 'Sesión no válida',
        text: 'Debes haber iniciado sesión para actualizar tus datos.',
        icon: 'error'
      });
      return;
    }

    setGuardando(true);
    try {
      await actualizarPerfilUsuario(usuarioActual.uid, {
        fullName,
        telefono,
        ciudad,
        biografia,
        fechaNacimiento,
        ...preferencias
      });

      if (fotoPerfil.length > 0 && fotoPerfil[0] instanceof File) {
        const resultadoFoto = await guardarFotoPerfilUsuario(
            usuarioActual.uid,
            fotoPerfil[0],
            fotoDocId
        );
        setFotoDocId(resultadoFoto.id);
        setImagenPerfilBase64(resultadoFoto.base64);
        setFotoBorrada(false);
        setFotoPerfil([]);
      } else if (fotoBorrada && fotoDocId) {
        await eliminarFotoPerfilUsuario(fotoDocId);
        setFotoDocId(null);
        setImagenPerfilBase64(DEFAULT_AVATAR);
        setFotoBorrada(false);
      }

      mostrarAlerta({
        title: 'Perfil Actualizado',
        text: 'Tu información y preferencias de viaje se han guardado con éxito.',
        icon: 'success'
      });

      window.dispatchEvent(new Event('perfilActualizado'));

    } catch (error) {
      console.error("Error al actualizar información:", error);
      mostrarAlerta({
        title: 'Error de actualización',
        text: 'No se pudieron guardar los cambios. Inténtalo nuevamente.',
        icon: 'error'
      });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
        </Box>
    );
  }

  return (
      <Box className="profile-container" sx={{ px: { xs: 1.5, sm: 3, md: 4 }, overflowX: 'hidden', pb: 8 }}>
        <Paper
            elevation={0}
            className="profile-card"
            sx={{
              p: { xs: 2, sm: 3, md: 4 },
              borderRadius: { xs: '16px', sm: '24px' },
              maxWidth: '1000px',
              mx: 'auto'
            }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <SelectorImagenes
                esPerfil={true}
                label="Foto de Perfil"
                imagenInicial={imagenPerfilBase64}
                onFilesChange={(files) => {
                  setFotoPerfil(files);
                  if (files.length === 0) {
                    setFotoBorrada(true);
                  } else {
                    setFotoBorrada(false);
                  }
                }}
            />
          </Box>

          {/* PESTAÑAS */}
          <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
                value={tabSubMenu}
                onChange={(_, newValue) => setTabSubMenu(newValue)}
                variant="fullWidth"
                textColor="primary"
                indicatorColor="primary"
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: { xs: '0.82rem', sm: '0.95rem' },
                    px: { xs: 1, sm: 3 },
                    minHeight: 48
                  }
                }}
            >
              <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Información Personal" />
              <Tab icon={<TuneIcon fontSize="small" />} iconPosition="start" label="Preferencias de Viaje" />
            </Tabs>
          </Box>

          {/* TAB 1: INFORMACIÓN PERSONAL */}
          {tabSubMenu === 0 && (
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid item xs={12} md={6}>
                  <label className="input-label">Nombre Completo:</label>
                  <TextField
                      fullWidth
                      placeholder="Ej: Julian Gómez Rojas"
                      variant="outlined"
                      className="pill-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <label className="input-label">Ciudad / Ubicación:</label>
                  <Autocomplete
                      options={opcionesCiudades}
                      loading={cargandoCiudades}
                      getOptionLabel={(option) => option.label}
                      filterOptions={(options, state) => {
                        const inputNormal = normalizarTexto(state.inputValue);
                        if (!inputNormal) return options;

                        return options.filter((opt) =>
                            normalizarTexto(opt.label).includes(inputNormal)
                        );
                      }}
                      value={opcionesCiudades.find(opt => opt.value === ciudad) || null}
                      onChange={(_, newValue) => {
                        setCiudad(newValue ? newValue.value : '');
                      }}
                      renderInput={(params) => (
                          <TextField
                              {...params}
                              placeholder="Selecciona tu ciudad..."
                              variant="outlined"
                              className="pill-input"
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                      {cargandoCiudades ? <CircularProgress color="inherit" size={20} /> : null}
                                      {params.InputProps.endAdornment}
                                    </>
                                ),
                              }}
                          />
                      )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <label className="input-label">Correo Electrónico:</label>
                  <TextField
                      fullWidth
                      disabled
                      placeholder="correo@dominio.com"
                      className="pill-input"
                      value={email}
                  />
                </Grid>


                <Grid item xs={12} md={6}>
                  <label className="input-label">Teléfono:</label>
                  <TextField
                      fullWidth
                      placeholder="Ej: +57 311 351 4732"
                      className="pill-input"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <label className="input-label">Fecha de Nacimiento:</label>
                  <TextField
                      fullWidth
                      type="date"
                      className="pill-input"
                      value={fechaNacimiento}
                      onChange={(e) => setFechaNacimiento(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end"><CalendarTodayIcon color="action" /></InputAdornment>,
                      }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <label className="input-label">Sobre mí (Biografía):</label>
                  <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Cuéntanos sobre tus pasiones viajeras, destinos favoritos o pasatiempos..."
                      variant="outlined"
                      value={biografia}
                      onChange={(e) => setBiografia(e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          backgroundColor: '#ffffff'
                        }
                      }}
                  />
                </Grid>
              </Grid>
          )}

          {/* TAB 2: PREFERENCIAS DE VIAJE */}
          {tabSubMenu === 1 && (
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                {preferenciasObligatorias && !estaPreferenciasCompletas && (
                    <Grid item xs={12}>
                      <Alert severity="warning" sx={{ borderRadius: '12px', fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        ⚠️ Para guardar tu perfil debes seleccionar todas las preferencias de viaje obligatorias (*).
                      </Alert>
                    </Grid>
                )}

                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ color: '#64748b', mb: 1, fontSize: { xs: '0.82rem', sm: '0.875rem' } }}>
                    Configura tus gustos para alimentar el algoritmo de recomendación personalizada.
                  </Typography>
                </Grid>

                {PREGUNTAS_PERFIL.map((pregunta) => {
                  const esMultiple = pregunta.esMultiple || false;
                  const valorActual = preferencias[pregunta.id] || (esMultiple ? [] : '');

                  // 💡 Inyectamos la opción de accesibilidad solo en tipoAcceso
                  const opcionesRender = pregunta.id === 'tipoAcceso'
                      ? [...pregunta.opciones, OPCION_ACCESIBILIDAD_DISCAPACIDAD]
                      : pregunta.opciones;

                  return (
                      <Grid item xs={12} md={6} key={pregunta.id}>
                        <label className="input-label">
                          {pregunta.titulo}{' '}
                          {preferenciasObligatorias && <span style={{ color: '#ef4444' }}>*</span>}{' '}
                          {esMultiple && <span style={{ fontSize: '0.78rem', color: '#0ea5e9' }}>(Selección múltiple)</span>}:
                        </label>
                        <TextField
                            select
                            fullWidth
                            className="pill-input"
                            SelectProps={{
                              multiple: esMultiple,
                              renderValue: esMultiple
                                  ? (selected) => (
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {(selected as string[]).map((val) => {
                                          const opt = opcionesRender.find(o => o.value === val);
                                          return (
                                              <Chip
                                                  key={val}
                                                  label={opt?.label || val}
                                                  size="small"
                                                  sx={{ borderRadius: '6px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}
                                              />
                                          );
                                        })}
                                      </Box>
                                  )
                                  : undefined
                            }}
                            value={valorActual}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleCambioPreferencia(
                                  pregunta.id,
                                  esMultiple && typeof val === 'string' ? val.split(',') : val
                              );
                            }}
                        >
                          {!esMultiple && (
                              <MenuItem value="">-- Sin Especificar --</MenuItem>
                          )}

                          {opcionesRender.map((opcion) => (
                              <MenuItem key={opcion.value} value={opcion.value}>
                                {esMultiple && (
                                    <Checkbox
                                        size="small"
                                        checked={Array.isArray(valorActual) && valorActual.includes(opcion.value)}
                                        sx={{ py: 0, mr: 1 }}
                                    />
                                )}
                                <ListItemText primary={opcion.label} />
                              </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                  );
                })}
              </Grid>
          )}

          <Grid container justifyContent="flex-end" sx={{ mt: 3 }}>
            <Grid item xs={12} sm="auto">
              <Button
                  variant="contained"
                  className="update-button"
                  endIcon={guardando ? <CircularProgress size={20} color="inherit" /> : <EditIcon />}
                  onClick={handleActualizarInformacion}
                  disabled={botonDeshabilitado}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {guardando ? 'Guardando...' : 'Actualizar Información'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* SECCIÓN DE DESTINOS FAVORITOS */}
        {favoritos.length > 0 && (
            <Box sx={{ mt: { xs: 4, sm: 6 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
                  <FavoriteIcon sx={{ color: '#ef4444' }} /> Mis Destinos Favoritos
                </Typography>
                <Button
                    variant="text"
                    onClick={() => navigate('/Destinos', { state: { tabActiva: '3' } })}
                    sx={{
                      color: '#0ea5e9',
                      fontWeight: 'bold',
                      textTransform: 'none',
                      fontSize: '0.9rem',
                      p: 0
                    }}
                >
                  Ver todos ({favoritos.length}) →
                </Button>
              </Stack>

              <Grid container spacing={3}>
                <div className="carousel-wrapper">
                  <div className="slider-container">
                    <button className="nav-btn left" onClick={() => scroll("left", scrollFavRef)}>
                      <ArrowBackIosIcon fontSize="small" />
                    </button>
                    <div className="cards-track" ref={scrollFavRef}>
                      {favoritos.slice(0, 10).map((post, index) => (
                          <Box
                              key={post.id || index}
                              sx={{
                                flex: '0 0 270px',
                                maxWidth: '270px',
                                width: '100%'
                              }}
                          >
                            <FeaturedPost post={post} ventana="principal" sub="0" />
                          </Box>
                      ))}
                    </div>
                    <button className="nav-btn right" onClick={() => scroll("right", scrollFavRef)}>
                      <ArrowForwardIosIcon fontSize="small" />
                    </button>
                  </div>
                </div>
              </Grid>
            </Box>
        )}
      </Box>
  );
};

export default Profile;