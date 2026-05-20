import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { GoogleAuthProvider, signInWithPopup,signInWithEmailAndPassword,onAuthStateChanged } from "firebase/auth";
import {doc, getDoc, setDoc} from "firebase/firestore";
import GoogleIcon from '@mui/icons-material/Google';
import {db,auth} from "../../firebase/firebaseConfig";
import {useNavigate} from "react-router-dom";
import {Divider} from "@mui/material";

const googleProvider = new GoogleAuthProvider();

// Esto fuerza a que el navegador siempre le deje elegir con qué cuenta entrar
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

function Copyright(props: any) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="https://mui.com/">
        Your Website
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const theme = createTheme();

export default function SignUp() {
  const navigate = useNavigate();
  const [errorMsj, setErrorMsj] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState<boolean>(true); // Estado para evitar el "pestañeo" de la UI
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsj(null); // Limpiamos errores previos antes de intentar entrar

    const data = new FormData(event.currentTarget);
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    // Validación básica en el cliente
    if (!email || !password) {
      setErrorMsj("Por favor, completa todos los campos.");
      return;
    }

    try {
      // 1. Validamos credenciales directamente contra el módulo de seguridad de Google Firebase
      const resultado = await signInWithEmailAndPassword(auth, email, password);
      const usuario = resultado.user;

      console.log("🔒 Sesión tradicional iniciada con éxito para:", usuario.email);

      // 2. Redirección inmediata al Dashboard tras comprobar identidad
      navigate("/");

    } catch (error: any) {
      console.error("❌ Fallo en el inicio de sesión base:", error.code);

      // Mapeo técnico de excepciones de seguridad para una interfaz amigable
      switch (error.code) {
        case 'auth/invalid-credential':
          setErrorMsj("El correo electrónico o la contraseña son incorrectos.");
          break;
        case 'auth/user-disabled':
          setErrorMsj("Esta cuenta ha sido deshabilitada por el administrador.");
          break;
        case 'auth/too-many-requests':
          setErrorMsj("Demasiados intentos fallidos. Cuenta bloqueada temporalmente.");
          break;
        default:
          setErrorMsj("Ocurrió un error inesperado en la autenticación.");
          break;
      }
    }
  };

  // Se removió el 'export' interno que rompía la estructura de React
  const iniciarSesionConGoogle = async () => {
    try {
      // 1. Abre la ventana flotante de Google de forma nativa
      const resultado = await signInWithPopup(auth, googleProvider);
      const usuario = resultado.user;

      console.log("✅ Autenticado en Google con el correo:", usuario.email);

      // 2. Control de Roles (RBAC): Verificamos si ya existe en Firestore
      const userDocRef = doc(db, "usuarios", usuario.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        console.log("🆕 Primer ingreso de este usuario. Creando perfil en Firestore...");

        // Si es nuevo, lo registramos por defecto como turista
        await setDoc(userDocRef, {
          fullName: usuario.displayName || "Usuario de Google",
          email: usuario.email,
          rol: "turista",
          fechaCreacion: Date.now(),
          estado: "verificado",
          correoBienvenidaEnviado: true // Google ya validó que el correo es real
        });
      } else {
        console.log("🔄 Usuario existente. Accediendo al sistema...");
      }

      // Redirección automática al Dashboard/Home tras loguearse
      navigate("/");
      return usuario;

    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user") {
        console.warn("El usuario cerró la ventana de Google antes de finalizar.");
      } else {
        console.error("❌ Error en el proceso de Auth con Google:", error.message);
      }
      return null;
    }
  };



  // 🔄 CICLO DE VIDA: Validar persistencia nativa al cargar la pantalla
  React.useEffect(() => {
    // Escuchamos el estado de la sesión en el LocalStorage interno de Firebase
    const desuscribir = onAuthStateChanged(auth, (usuario) => {
      if (usuario) {
        console.log("🤖 Persistencia activada: Usuario detectado en caché. Redirigiendo...");
        navigate("/"); // Si ya estaba logueado, lo mandamos directo al sistema
      } else {
        setCargando(false); // Si no hay sesión, dejamos de cargar y mostramos el formulario limpio
      }
    });

    // Limpieza del escuchador cuando el componente se desmonte
    return () => desuscribir();
  }, [navigate]);

  // Si el sistema está verificando el token en el LocalStorage, mostramos una pantalla limpia
  if (cargando) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Typography variant="h6" color="text.secondary">Verificando sesión...</Typography>
        </Box>
    );
  }



  return (
    
    <>
    <ThemeProvider theme={theme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5">
            Sign in
          </Typography>
          {/* 🔥 SE AGREGÓ width: '100%' AQUÍ PARA EVITAR QUE EL FORMULARIO SE COMPRIMA */}
          <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3, width: '100%' }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                    fullWidth
                    name="password"
                    label="Password"
                    type="password"
                    id="password"
                    autoComplete="new-password"
                />
              </Grid>
            </Grid>

            <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
            >
              Sign in
            </Button>

            <Divider sx={{ my: 2, color: 'text.secondary', fontSize: '0.85rem' }}>ó</Divider>

            <Button
                type="button"
                fullWidth
                variant="outlined"
                onClick={iniciarSesionConGoogle}
                // 🔥 USAMOS EL COMPONENTE VECTORIAL NATIVO DE MATERIAL UI CON EL COLOR ORIGINAL DE GOOGLE
                startIcon={<GoogleIcon sx={{ color: '#db4437' }} />}
                sx={{
                  mb: 3,
                  borderColor: '#dadce0',
                  color: '#3c4043',
                  backgroundColor: '#ffffff',
                  textTransform: 'none',
                  fontWeight: 'medium',
                  '&:hover': {
                    borderColor: '#d2e3fc',
                    backgroundColor: '#f8fafd',
                  },
                }}
            >
              Continuar con Google
            </Button>
            <Grid container justifyContent="flex-end">
              <Grid item
                sx={{ mb: 4 }}>
                <Link href="/register" variant="body2">
                  I don't have account
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
    </>
  );
}