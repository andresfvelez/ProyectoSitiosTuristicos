// Antd
import { Layout, Spin } from "antd";
import React, {Suspense, useEffect, useState} from "react";
import FooterComponent from "./Layouts/Footer";
import Headers from "./Layouts/Header";
import InitialPage from "./Components/Pages/InitialPage";
import Pagina2 from "./Components/Pages/Lugar.page";
import PublicarDestino  from "./Components/Pages/Publicar";
import Profile from "./Components/Pages/Profile";
import Login from "./Components/Pages/Login";
import Register from "./Components/Pages/Register";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import MapaUbicacion from "./Components/Pages/Seccions/Localizacionleaf";
import {obtenerImagenesPorDestino, obtenerLugares} from "./services/lugaresService";
import {LugarTuristico} from "./Components/models/LugarTuristico";
import {AuthProvider} from "./providers/AuthProvider";

const { Content, Footer } = Layout;

// Rutas


// Pages

const sections = [
  { title: "Destinos", url: "/Destinos" },
  { title: "Publicar", url: "/Publicar" },
  { title: "Al Aire Libre", url: "/airelibre" },
  { title: "Relajacion", url: "/relajacion" },
];

function App() {
    const [lugares, setLugares] = useState<LugarTuristico[]>([]);
    useEffect(() => {
        // Aquí traes tus 50-100 lugares de Firebase una sola vez
        const fetchLugares = async () => {
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
            setLugares(lugaresConFotos);

        };
        fetchLugares();
    }, []);
    return (
        <AuthProvider>
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

                    <Headers sections={sections} availablePlaces={lugares}/>

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
                            <Route path="/Destinos" element={<PublicarDestino />} />
                            <Route path="/Publicar" element={<PublicarDestino />} />
                            <Route path="/profile" element={<Profile />} />
                        </Routes>
                    </Content>

                    {/* Usamos el Footer que tenías importado */}
                    <FooterComponent />

                </Layout>
            </Suspense>
        </BrowserRouter>
            </AuthProvider>
    );
}

export default App;
