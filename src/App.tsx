// Antd
import { Layout, Spin } from "antd"; // Importación unificada
import React, { Suspense } from "react";

// Componentes
import FooterComponent from "./Layouts/Footer"; // Renombrado para evitar conflicto
import Headers from "./Layouts/Header";
import InitialPage from "./Components/Pages/InitialPage";
import Pagina2 from "./Components/Pages/Lugar.page";
import { Publicacion } from "./Components/Pages/Publicar";
import Localizacion from "./Components/Pages/Seccions/Localization";
import Profile from "./Components/Pages/Profile";
import Login from "./Components/Pages/Login";
import Register from "./Components/Pages/Register";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import MapaUbicacion from "./Components/Pages/Seccions/Localizacionleaf";

// Destructuring de Antd Layout
const { Content, Footer } = Layout;

// Rutas


// Pages

const sections = [
  { title: "Destinos", url: "/Destinos" },
  { title: "Tours", url: "/Tours" },
  { title: "Al Aire Libre", url: "/airelibre" },
  { title: "Relajacion", url: "/relajacion" },
];

function App() {
    return (
        <BrowserRouter>
            <Suspense
                fallback={
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                        <Spin size="large" tip="Cargando Componentes..." />
                    </div>
                }
            >
                {/* minHeight: '100vh' asegura que el layout ocupe toda la pantalla */}
                <Layout style={{ minHeight: '100vh', backgroundColor: '#fff' }}>

                    <Headers sections={sections} />

                    {/* El Content envuelve las rutas para manejar el espaciado interno */}
                    <Content style={{ marginTop: '70px', minHeight: 'calc(100vh - 70px)' }}>   <Routes>
                            <Route path="/register" element={<Register />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/" element={<InitialPage />} />
                            <Route path="/pagina2" element={<Pagina2 />} />
                            <Route path="/localizacion" element={<div style={{ padding: '32px' }}>
                                <h2>Parque Nacional Natural Tayrona</h2>

                                <MapaUbicacion
                                    lat={4.5709}
                                    lng={-74.2973}
                                    nombre="Parque Tayrona"
                                />
                            </div>} />
                            <Route path="/Destinos" element={<Publicacion />} />
                            <Route path="/profile" element={<Profile />} />
                        </Routes>
                    </Content>

                    {/* Usamos el Footer que tenías importado */}
                    <FooterComponent />

                </Layout>
            </Suspense>
        </BrowserRouter>
    );
}

export default App;
