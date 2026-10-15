import React, { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Layout, Spin } from "antd";
import { logEvent } from "firebase/analytics";

import { analytics } from "./firebase/firebaseConfig";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { obtenerLugares } from "./services/lugaresService";
import { LugarTuristico } from "./Components/models/LugarTuristico";

import Headers from "./Layouts/Header";
import FooterComponent from "./Layouts/Footer";
import { ScrollToTop } from "./Layouts/Utils/ScrollTop";
import { RecaptchaMarca } from "./Components/Pages/Seccions/RecaptchaMarca";

import InitialPage from "./Components/Pages/InitialPage";
import DestinosSearchPage from "./Components/Pages/DestinosSearchPage";
import Destino from "./Components/Pages/DestinoPage";
import PublicarDestino from "./Components/Pages/PublicarDestino";
import EditarDestino from "./Components/Pages/EditarDestino";
import Profile from "./Components/Pages/Profile";
import Login from "./Components/Pages/Login";
import Register from "./Components/Pages/Register";

import AprobarDestinos from "./Components/Pages/AprobarDestinos";
import Reportes from "./Components/Pages/Reportes";
import UsuariosAdmin from "./Components/Pages/UsuariosAdmin";
import ScrapperMejorado from "./Components/Pages/ScrapperMejorado";
import MapaUbicacion from "./Components/Pages/Seccions/Localizacionleaf";

const { Content } = Layout;

const sections = [
    { title: "Destinos", url: "/Destinos" },
    { title: "Publicar", url: "/Publicar" }
];

// Observador desacoplado para telemetría de navegación en Google Analytics 4
const GestorAnalytics: React.FC = () => {
    const location = useLocation();

    useEffect(() => {
        if (analytics) {
            try {
                logEvent(analytics, 'page_view', {
                    page_location: window.location.href,
                    page_path: location.pathname
                });
            } catch {
                // Previene interrupciones causadas por bloqueadores de anuncios o extensiones
            }
        }
    }, [location]);

    return null;
};

export default function App() {
    const [lugares, setLugares] = useState<LugarTuristico[]>([]);

    useEffect(() => {
        let isMounted = true;

        const fetchLugares = async () => {
            try {
                const listaLugares = await obtenerLugares();
                if (isMounted) {
                    setLugares(listaLugares || []);
                }
            } catch {
                if (isMounted) {
                    setLugares([]);
                }
            }
        };

        fetchLugares();

        return () => {
            isMounted = false;
        };
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
                    <Layout style={{ minHeight: '100vh', backgroundColor: '#fff' }}>
                        <Headers sections={sections} availablePlaces={lugares} />

                        <Content style={{ marginTop: '70px', minHeight: 'calc(100vh - 70px)' }}>
                            <Routes>
                                {/* Rutas públicas de acceso general */}
                                <Route path="/" element={<InitialPage />} />
                                <Route path="/Destinos" element={<DestinosSearchPage />} />
                                <Route path="/destino/:id" element={<Destino />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />

                                {/* Demostración geoespacial */}
                                <Route
                                    path="/localizacion"
                                    element={
                                        <div style={{ padding: '32px' }}>
                                            <h2>Parque Nacional Natural Tayrona</h2>
                                            <MapaUbicacion
                                                lat={4.5709}
                                                lng={-74.2973}
                                                nombre="Parque Tayrona"
                                            />
                                        </div>
                                    }
                                />

                                {/* Rutas protegidas para usuarios autenticados */}
                                <Route element={<ProtectedRoute rolesPermitidos={['turista', 'administrador']} />}>
                                    <Route path="/Publicar" element={<PublicarDestino />} />
                                    <Route path="/editar-destino/:id" element={<EditarDestino />} />
                                    <Route path="/profile" element={<Profile />} />
                                </Route>

                                {/* Rutas restringidas a nivel de administración */}
                                <Route element={<ProtectedRoute rolesPermitidos={['administrador']} />}>
                                    <Route path="/admin/pendientes" element={<AprobarDestinos />} />
                                    <Route path="/admin/reportes" element={<Reportes />} />
                                    <Route path="/admin/usuarios" element={<UsuariosAdmin />} />
                                    <Route path="/admin/scrapper" element={<ScrapperMejorado />} />
                                </Route>

                                {/* Redirección de contingencia para rutas inexistentes */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Content>

                        <RecaptchaMarca />
                    </Layout>
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
    );
}