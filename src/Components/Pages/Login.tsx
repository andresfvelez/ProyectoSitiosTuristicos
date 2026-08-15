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
import {
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "firebase/auth";
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import { auth } from "../../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { Divider, Button } from "@mui/material";
import ReCAPTCHA from "react-google-recaptcha";
import { useEffect, useState, useRef } from "react";
import Swal from 'sweetalert2';
import { mostrarAlerta } from '../../Layouts/Utils/alertUtils';
import {
    enviarCorreoRecuperacion,
    verificarUsuarioBloqueado,
    obtenerClaveRecaptcha,
    obtenerPerfilUsuario,
    iniciarSesionGoogleHibrido,
    iniciarSesionFacebookHibrido
} from '../../services/usuariosService';

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
    const esLoginManualRef = useRef<boolean>(false);

    const esFormularioValido = email.trim() !== '' && password.trim() !== '' && captchaValido;

    const redirigirSegunEstadoPerfil = async (uid: string) => {
        const perfil = await obtenerPerfilUsuario(uid);
        if (perfil && perfil.perfilIncompleto) {
            await mostrarAlerta({
                title: 'Completa tu perfil',
                text: 'Detectamos que tu información de usuario no está completa. Te redirigiremos para actualizar tus datos.',
                icon: 'info',
                confirmButtonText: 'Ir a mi perfil',
                showCloseButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false
            });
            navigate("/profile");
        } else {
            navigate("/");
        }
    };

    const verificarEstadoAcceso = async (uid: string): Promise<boolean> => {
        const estaBloqueado = await verificarUsuarioBloqueado(uid);
        if (estaBloqueado) {
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

    const handleOlvidasteContrasena = async () => {
        const { value: emailIngresado } = await Swal.fire({
            title: 'Recuperar Contraseña',
            text: 'Ingresa tu correo electrónico registrado y te enviaremos un enlace de restauración.',
            input: 'email',
            inputValue: email,
            inputPlaceholder: 'ejemplo@correo.com',
            showCancelButton: true,
            confirmButtonText: 'Enviar Enlace',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#1976d2',
            cancelButtonColor: '#dc2626',
            inputValidator: (value) => {
                if (!value) {
                    return '¡Debes ingresar un correo electrónico!';
                }
                return null;
            }
        });

        if (emailIngresado) {
            const resultado = await enviarCorreoRecuperacion(emailIngresado);

            if (resultado.esExterno) {
                mostrarAlerta({
                    title: 'Inicio con Proveedor Externo',
                    text: 'Esta cuenta fue registrada mediante Google o Facebook. No requiere contraseña, inicia sesión directamente con el botón de la red social.',
                    icon: 'info'
                });
            } else if (resultado.exito) {
                mostrarAlerta({
                    title: '¡Correo enviado!',
                    text: 'Revisa tu bandeja de entrada (y la carpeta de spam) para restablecer tu contraseña.',
                    icon: 'success'
                });
            } else if (resultado.errorKey === 'auth/user-not-found') {
                mostrarAlerta({
                    title: 'Usuario no encontrado',
                    text: 'No existe ninguna cuenta registrada con este correo electrónico.',
                    icon: 'error'
                });
            } else {
                mostrarAlerta({
                    title: 'Error de envío',
                    text: 'No se pudo procesar la solicitud. Inténtalo de nuevo más tarde.',
                    icon: 'error'
                });
            }
        }
    };

    useEffect(() => {
        const cargarRecaptcha = async () => {
            const key = await obtenerClaveRecaptcha();
            setRecaptchaKey(key);
        };
        cargarRecaptcha();
    }, []);

    useEffect(() => {
        const desuscribir = onAuthStateChanged(auth, async (usuario) => {
            if (usuario && !esLoginManualRef.current) {
                await redirigirSegunEstadoPerfil(usuario.uid);
            } else if (!usuario) {
                setCargando(false);
            }
        });
        return () => desuscribir();
    }, []);

    const resetearCaptcha = () => {
        recaptchaRef.current?.reset();
        setCaptchaValido(false);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!esFormularioValido) return;

        esLoginManualRef.current = true;

        try {
            const resultado = await signInWithEmailAndPassword(auth, email, password);
            const uid = resultado.user.uid;

            const estaPermitido = await verificarEstadoAcceso(uid);
            if (!estaPermitido) {
                resetearCaptcha();
                esLoginManualRef.current = false;
                return;
            }

            await redirigirSegunEstadoPerfil(uid);
        } catch (error: any) {
            console.error("❌ Fallo en inicio de sesión:", error.code);
            resetearCaptcha();
            esLoginManualRef.current = false;

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
            } else {
                mostrarAlerta({
                    title: 'Error de autenticación',
                    text: 'Ocurrió un problema inesperado. Por favor intenta de nuevo.',
                    icon: 'error'
                });
            }
        }
    };

    // 🚀 GOOGLE HÍBRIDO (Mantiene la misma alerta y verificaciones de bloqueo)
    const iniciarSesionConGoogle = async () => {
        esLoginManualRef.current = true;
        try {
            // Reemplazamos 'signInWithPopup' por nuestra función que decide si es Web o App Móvil
            const usuario = await iniciarSesionGoogleHibrido();

            const estaPermitido = await verificarEstadoAcceso(usuario.uid);
            if (!estaPermitido) {
                esLoginManualRef.current = false;
                return;
            }

            await redirigirSegunEstadoPerfil(usuario.uid);
        } catch (error: any) {
            esLoginManualRef.current = false;
            if (error.code !== "auth/popup-closed-by-user") {
                mostrarAlerta({
                    title: 'Error con Google',
                    text: 'No se pudo completar el inicio de sesión con Google.',
                    icon: 'error'
                });
            }
        }
    };

    // 🚀 FACEBOOK HÍBRIDO (Mantiene la misma alerta y verificaciones de bloqueo)
    const iniciarSesionConFacebook = async () => {
        esLoginManualRef.current = true;
        try {
            // Reemplazamos 'signInWithPopup' por nuestra función que decide si es Web o App Móvil
            const usuario = await iniciarSesionFacebookHibrido();

            const estaPermitido = await verificarEstadoAcceso(usuario.uid);
            if (!estaPermitido) {
                esLoginManualRef.current = false;
                return;
            }

            await redirigirSegunEstadoPerfil(usuario.uid);
        } catch (error: any) {
            esLoginManualRef.current = false;
            if (error.code === 'auth/account-exists-with-different-credential') {
                mostrarAlerta({
                    title: 'Correo ya registrado',
                    text: 'Ya existe una cuenta vinculada a este correo con otro método de inicio de sesión.',
                    icon: 'warning'
                });
            } else if (error.code !== "auth/popup-closed-by-user") {
                mostrarAlerta({
                    title: 'Error con Facebook',
                    text: 'No se pudo completar el inicio de sesión con Facebook.',
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

                                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
                                    <Typography
                                        variant="body2"
                                        onClick={handleOlvidasteContrasena}
                                        sx={{
                                            color: '#1976d2',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            '&:hover': { textDecoration: 'underline' }
                                        }}
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </Typography>
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
                                    mt: 2,
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
                                    mb: 1.5,
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

                            <Button
                                type="button"
                                fullWidth
                                variant="outlined"
                                onClick={iniciarSesionConFacebook}
                                startIcon={<FacebookIcon sx={{ color: '#1877f2' }} />}
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
                                Continuar con Facebook
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