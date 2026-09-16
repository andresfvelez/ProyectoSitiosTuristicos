// Antd
import { Layout, Spin } from "antd";
import { logEvent } from "firebase/analytics";
import { analytics } from "./firebase/firebaseConfig";
import React, {Suspense, useEffect, useState} from "react";
import FooterComponent from "./Layouts/Footer";
import Headers from "./Layouts/Header";
import InitialPage from "./Components/Pages/InitialPage";
import Pagina2 from "./Components/Pages/Lugar.page";
import PublicarDestino  from "./Components/Pages/PublicarDestino";
import Profile from "./Components/Pages/Profile";
import Login from "./Components/Pages/Login";
import Register from "./Components/Pages/Register";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom"; //
import MapaUbicacion from "./Components/Pages/Seccions/Localizacionleaf";
import {obtenerImagenesPorDestino, obtenerLugares} from "./services/lugaresService";
import {LugarTuristico} from "./Components/models/LugarTuristico";
import {AuthProvider} from "./auth/AuthProvider";
import { ProtectedRoute } from './auth/ProtectedRoute';
import EditarDestino from "./Components/Pages/EditarDestino";
import AprobarDestinos from "./Components/Pages/AprobarDestinos";
import DestinosPage from "./Components/Pages/DestinosPage";
import Reportes from "./Components/Pages/Reportes";
import {RecaptchaMarca} from "./Components/Pages/Seccions/RecaptchaMarca";
import {ScrollToTop} from "./Layouts/Utils/ScrollTop";
import ScrapperMejorado from "./Components/Pages/ScrapperMejorado";
import UsuariosAdmin from "./Components/Pages/UsuariosAdmin";
const { Content } = Layout;

// Rutas


// Pages

const sections = [
  { title: "Destinos", url: "/Destinos" },
  { title: "Publicar", url: "/Publicar" }
];

function App() {

    const GestorAnalytics = () => {
        const location = useLocation();

        useEffect(() => {
            if (analytics) {
                logEvent(analytics, 'page_view', {
                    page_location: window.location.href,
                    page_path: location.pathname
                });
            }
        }, [location]);

        return null;
    };

    const [lugares, setLugares] = useState<LugarTuristico[]>([]);
    useEffect(() => {
        const fetchLugares = async () => {
            const listaLugares = await obtenerLugares();

            setLugares(listaLugares);

        };
        fetchLugares();
    }, []);
    return (
        <AuthProvider>
        <BrowserRouter>
            <ScrollToTop />
            <GestorAnalytics />
            <Suspense
                fallback={
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                        <Spin size="large" tip="Cargando Componentes..." />
                    </div>
                }
            >
                {/* minHeight: '100vh' asegura que el layout ocupe toda la pantalla */}
                <Layout style={{ minHeight: '100vh', backgroundColor: '#fff' }}>

                    <Headers sections={sections} availablePlaces={lugares}/>

                    {/* El Content envuelve las rutas para manejar el espaciado interno */}
                    <Content style={{ marginTop: '70px', minHeight: 'calc(100vh - 70px)' }}>   <Routes>
                            <Route path="/register" element={<Register />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/" element={<InitialPage />} />
                            <Route path="/Destinos" element={<DestinosPage />} />
                            <Route path="/pagina2/:id" element={<Pagina2 />} />

                            <Route path="/localizacion" element={<div style={{ padding: '32px' }}>
                                <h2>Parque Nacional Natural Tayrona</h2>
                                <MapaUbicacion
                                    lat={4.5709}
                                    lng={-74.2973}
                                    nombre="Parque Tayrona"
                                />
                            </div>} />
                        <Route element={<ProtectedRoute rolesPermitidos={['turista', 'administrador']} />}>

                            <Route path="/Publicar" element={<PublicarDestino />} />
                            <Route path="/editar-destino/:id" element={<EditarDestino />} />
                            <Route path="/profile" element={<Profile />} />
                        </Route>

                        <Route element={<ProtectedRoute rolesPermitidos={['administrador']} />}>
                            <Route path="/admin/pendientes" element={<AprobarDestinos />} />
                            <Route path="/admin/reportes" element={<Reportes />} />
                            <Route path="/admin/scrapper" element={<ScrapperMejorado />} />
                            <Route path="/admin/usuarios" element={<UsuariosAdmin />} />
                        </Route>
                        </Routes>
                    </Content>

                    {/* Usamos el Footer que tenías importado */}
                    <FooterComponent />
                    <RecaptchaMarca />
                </Layout>
            </Suspense>
        </BrowserRouter>
            </AuthProvider>
    );
}

export default App;
