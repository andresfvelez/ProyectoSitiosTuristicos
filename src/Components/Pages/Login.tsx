import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import GoogleIcon from '@mui/icons-material/Google';
import { db, auth } from "../../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { Divider, Button } from "@mui/material";
import ReCAPTCHA from "react-google-recaptcha";
import { useEffect, useState, useRef } from "react";
import { mostrarAlerta } from '../../Layouts/Utils/alertUtils';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const theme = createTheme();

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [mostrarPassword, setMostrarPassword] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(true);
  const [captchaValido, setCaptchaValido] = useState<boolean>(false);
  const [recaptchaKey, setRecaptchaKey] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const esFormularioValido = email.trim() !== '' && password.trim() !== '' && captchaValido;

  // 🎯 Función para redirigir según el estado de perfilIncompleto
  const redirigirSegunEstadoPerfil = async (uid: string) => {
    try {
      const userDocRef = doc(db, "usuarios", uid);
      const userSnap = await getDoc(userDocRef);

      console.log(userSnap.data());
      if (userSnap.exists() && userSnap.data()?.perfilIncompleto === true) {
        navigate("/profile");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Error al verificar estado del perfil:", error);
      navigate("/");
    }
  };

  const verificarEstadoUsuario = async (uid: string): Promise<boolean> => {
    const userDocRef = doc(db, "usuarios", uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists() && userSnap.data()?.estado === "bloqueado") {
      await auth.signOut();
      mostrarAlerta({
        title: 'Acceso Restringido',
        text: 'Tu cuenta ha sido bloqueada por el administrador. Contacta con soporte.',
        icon: 'error'
      });
      return false;
    }
    return true;
  };

  useEffect(() => {
    const obtenerKeyRecaptcha = async () => {
      try {
        const docRefRecaptcha = doc(db, "Constantes", "Recaptcha");
        const docSnapRecaptcha = await getDoc(docRefRecaptcha);
        if (docSnapRecaptcha.exists()) {
          setRecaptchaKey(docSnapRecaptcha.data()?.key);
        }
      } catch (error) {
        console.error("Error obteniendo la clave de reCAPTCHA:", error);
      }
    };
    obtenerKeyRecaptcha();
  }, []);

  // 🔄 Redirección condicional cuando ya hay sesión persistida
  useEffect(() => {
    const desuscribir = onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        await redirigirSegunEstadoPerfil(usuario.uid);
      } else {
        setCargando(false);
      }
    });
    return () => desuscribir();
  }, [navigate]);

  const resetearCaptcha = () => {
    recaptchaRef.current?.reset();
    setCaptchaValido(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!esFormularioValido) return;

    try {
      const resultado = await signInWithEmailAndPassword(auth, email, password);
      const uid = resultado.user.uid;

      const estaPermitido = await verificarEstadoUsuario(uid);
      if (!estaPermitido) {
        resetearCaptcha();
        return;
      }

      // 🎯 Evaluación del perfil tras inicio exitoso
      await redirigirSegunEstadoPerfil(uid);

    } catch (error: any) {
      console.error("❌ Fallo en inicio de sesión:", error.code);
      resetearCaptcha();

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        mostrarAlerta({
          title: 'Credenciales incorrectas',
          text: 'El correo electrónico o la contraseña ingresados son incorrectos.',
          icon: 'error'
        });
      } else if (error.code === 'auth/user-disabled') {
        mostrarAlerta({
          title: 'Cuenta deshabilitada',
          text: 'Esta cuenta ha sido inhabilitada por el administrador.',
          icon: 'error'
        });
      } else if (error.code === 'auth/invalid-email') {
        mostrarAlerta({
          title: 'Correo inválido',
          text: 'El formato del correo electrónico ingresado no es válido.',
          icon: 'error'
        });
      } else {
        mostrarAlerta({
          title: 'Error de autenticación',
          text: 'Ocurrió un problema inesperado. Por favor intenta de nuevo.',
          icon: 'error'
        });
      }
    }
  };

  const iniciarSesionConGoogle = async () => {
    try {
      const resultado = await signInWithPopup(auth, googleProvider);
      const usuario = resultado.user;

      const estaPermitido = await verificarEstadoUsuario(usuario.uid);
      if (!estaPermitido) return;

      const userDocRef = doc(db, "usuarios", usuario.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        await setDoc(userDocRef, {
          fullName: usuario.displayName || "Usuario de Google",
          email: usuario.email,
          rol: "turista",
          estado: "activo",
          perfilIncompleto: true, // 👈 Marca inicial para nuevos ingresos con Google
          fechaCreacion: Date.now(),
          correoBienvenidaEnviado: true
        });
      }

      // 🎯 Evaluación del perfil tras autenticarse con Google
      await redirigirSegunEstadoPerfil(usuario.uid);
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") {
        mostrarAlerta({
          title: 'Error con Google',
          text: 'No se pudo completar el inicio de sesión con Google.',
          icon: 'error'
        });
      }
    }
  };

  if (cargando) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
            Verificando sesión...
          </Typography>
        </Box>
    );
  }

  return (
      <ThemeProvider theme={theme}>
        <Box
            sx={{
              minHeight: 'calc(100vh - 80px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8fafc',
              py: 6,
              px: 2
            }}
        >
          <Container component="main" maxWidth="xs">
            <CssBaseline />
            <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, sm: 4 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  backgroundColor: '#ffffff'
                }}
            >
              <Typography component="h1" variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                Iniciar Sesión
              </Typography>

              <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                        fullWidth
                        id="email"
                        label="Correo Electrónico"
                        name="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                        fullWidth
                        name="password"
                        label="Contraseña"
                        type={mostrarPassword ? 'text' : 'password'}
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        sx={{
                          '& input::-ms-reveal, & input::-ms-clear': { display: 'none' }
                        }}
                        InputProps={{
                          endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                    aria-label="toggle password visibility"
                                    onClick={() => setMostrarPassword(!mostrarPassword)}
                                    edge="end"
                                >
                                  {mostrarPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                          ),
                        }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    {recaptchaKey && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                          <ReCAPTCHA
                              ref={recaptchaRef}
                              sitekey={recaptchaKey}
                              onChange={(token) => setCaptchaValido(!!token)}
                          />
                        </Box>
                    )}
                  </Grid>
                </Grid>

                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={!esFormularioValido}
                    sx={{
                      mt: 3,
                      mb: 2,
                      py: 1.3,
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      borderRadius: '10px',
                      textTransform: 'none',
                      backgroundColor: '#1976d2',
                      boxShadow: 'none',
                      '&:hover': {
                        backgroundColor: '#1565c0',
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)'
                      },
                      '&:disabled': {
                        backgroundColor: '#e2e8f0',
                        color: '#94a3b8'
                      }
                    }}
                >
                  Iniciar Sesión
                </Button>

                <Divider sx={{ my: 2, color: '#94a3b8', fontSize: '0.85rem' }}>ó</Divider>

                <Button
                    type="button"
                    fullWidth
                    variant="outlined"
                    onClick={iniciarSesionConGoogle}
                    startIcon={<GoogleIcon sx={{ color: '#db4437' }} />}
                    sx={{
                      mb: 3,
                      py: 1.1,
                      borderColor: '#cbd5e1',
                      color: '#334155',
                      backgroundColor: '#ffffff',
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '10px',
                      '&:hover': {
                        borderColor: '#94a3b8',
                        backgroundColor: '#f8fafc',
                      },
                    }}
                >
                  Continuar con Google
                </Button>

                <Grid container justifyContent="center">
                  <Grid item>
                    <Link href="/register" variant="body2" sx={{ color: '#1976d2', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                      ¿No tienes una cuenta? Regístrate
                    </Link>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Container>
        </Box>
      </ThemeProvider>
  );
}