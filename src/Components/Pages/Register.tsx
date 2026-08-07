import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 Importación agregada
import emailjs from "@emailjs/browser";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../../firebase/firebaseConfig";
import CryptoJS from "crypto-js";
import { createUserWithEmailAndPassword } from "firebase/auth";
import ReCAPTCHA from "react-google-recaptcha";
import { mostrarAlerta } from '../../Layouts/Utils/alertUtils';

const theme = createTheme();

export default function SignUp() {
  const navigate = useNavigate(); // 👈 Hook para redireccionar
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rpassword, setRpassword] = useState<string>('');

  const [mostrarPassword, setMostrarPassword] = useState<boolean>(false);
  const [mostrarRPassword, setMostrarRPassword] = useState<boolean>(false);

  const [recaptchaKey, setRecaptchaKey] = useState<string | null>(null);
  const [captchaValido, setCaptchaValido] = useState<boolean>(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const esFormularioValido =
      fullName.trim() !== '' &&
      email.trim() !== '' &&
      password.trim() !== '' &&
      rpassword.trim() !== '' &&
      captchaValido;

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

  const resetearCaptcha = () => {
    recaptchaRef.current?.reset();
    setCaptchaValido(false);
  };

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaValido(!!token);
  };

  const obtenerMessagingData = async () => {
    try {
      const docRef = doc(db, "Constantes", "claves");
      const docSnap = await getDoc(docRef);
      const docRefEmail = doc(db, "Constantes", "email_data");
      const docSnapEmail = await getDoc(docRefEmail);

      if (!docSnap.exists() || !docSnapEmail.exists()) return null;

      const fraseMaestra = docSnap.data().encriptado;
      const dataEmail = docSnapEmail.data();

      return {
        template_creacion_usuarios: desencriptarDatos(dataEmail.template_creacion_usuarios, fraseMaestra),
        service: desencriptarDatos(dataEmail.service, fraseMaestra),
        key: desencriptarDatos(dataEmail.key, fraseMaestra)
      };
    } catch (error) {
      console.error("Error desencriptando:", error);
      return null;
    }
  };

  const desencriptarDatos = (data: string, key: string): string => {
    try {
      const bytes = CryptoJS.AES.decrypt(data, key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      return "";
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!esFormularioValido) return;

    if (password !== rpassword) {
      resetearCaptcha();
      mostrarAlerta({
        title: 'Las contraseñas no coinciden',
        text: 'Asegúrate de escribir exactamente la misma contraseña en ambos campos.',
        icon: 'warning'
      });
      return;
    }

    try {
      const credenciales = await createUserWithEmailAndPassword(auth, email, password);
      const uid = credenciales.user.uid;

      // 🚩 Registro inicial guardado con perfilIncompleto: true
      await setDoc(doc(db, "usuarios", uid), {
        fullName,
        email,
        rol: "turista",
        estado: "activo",
        perfilIncompleto: true,
        fechaCreacion: Date.now()
      });

      const emailData = await obtenerMessagingData();
      if (emailData) {
        await emailjs.send(
            emailData.service,
            emailData.template_creacion_usuarios,
            {
              user: fullName,
              email_user: email,
              password: password,
              link: window.location.origin
            },
            emailData.key
        );
      }

      // 🎯 Redirección a /profile al hacer clic en la alerta
      mostrarAlerta({
        title: '¡Cuenta creada!',
        text: 'Tu registro ha sido completado. Por favor completa tu perfil para continuar.',
        icon: 'success',
        confirmButtonText: 'Ir a mi perfil'
      }).then(() => {
        navigate("/profile");
      });

    } catch (error: any) {
      console.error("❌ Error en registro:", error);
      resetearCaptcha();

      if (error.code === 'auth/password-does-not-meet-requirements') {
        const match = error.message?.match(/\[(.*?)\]/);
        const listaRequisitos = match && match[1]
            ? match[1].split(',').map((req: string) =>
                req.trim()
                    .replace(/Password must contain/gi, 'Debe contener')
                    .replace(/at least/gi, 'al menos')
                    .replace(/characters/gi, 'caracteres')
                    .replace(/a numeric character/gi, 'un número')
                    .replace(/a non-alphanumeric character/gi, 'un carácter especial')
                    .replace(/a lowercase character/gi, 'una letra minúscula')
                    .replace(/an uppercase character/gi, 'una letra mayúscula')
            )
            : [];

        const htmlLista = listaRequisitos.length > 0
            ? `<ul style="text-align: left; margin-top: 12px; padding-left: 24px; line-height: 1.6; color: #475569; font-size: 0.9rem;">
              ${listaRequisitos.map((item: any) => `<li style="margin-bottom: 4px;">${item}</li>`).join('')}
             </ul>`
            : '<p style="color: #475569;">La contraseña no cumple con los criterios de seguridad definidos.</p>';

        mostrarAlerta({
          title: 'Requisitos de la contraseña',
          html: htmlLista,
          icon: 'warning'
        });

      } else if (error.code === 'auth/email-already-in-use') {
        mostrarAlerta({
          title: 'Correo registrado',
          text: 'Este correo electrónico ya se encuentra registrado en la plataforma.',
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
          title: 'Error de registro',
          text: 'No se pudo completar la creación de la cuenta. Inténtalo nuevamente.',
          icon: 'error'
        });
      }
    }
  };

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
                Crear Cuenta
              </Typography>

              <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                        fullWidth
                        id="fullName"
                        label="Nombre Completo"
                        name="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                        fullWidth
                        id="email"
                        label="Correo Electrónico"
                        name="email"
                        type="email"
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
                    <TextField
                        fullWidth
                        name="rpassword"
                        label="Repetir Contraseña"
                        type={mostrarRPassword ? 'text' : 'password'}
                        id="rpassword"
                        value={rpassword}
                        onChange={(e) => setRpassword(e.target.value)}
                        sx={{
                          '& input::-ms-reveal, & input::-ms-clear': { display: 'none' }
                        }}
                        InputProps={{
                          endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                    aria-label="toggle repeat password visibility"
                                    onClick={() => setMostrarRPassword(!mostrarRPassword)}
                                    edge="end"
                                >
                                  {mostrarRPassword ? <VisibilityOff /> : <Visibility />}
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
                              onChange={handleCaptchaChange}
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
                  Registrarse
                </Button>

                <Grid container justifyContent="center">
                  <Grid item>
                    <Link href="/login" variant="body2" sx={{ color: '#1976d2', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                      ¿Ya tienes una cuenta? Inicia sesión
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