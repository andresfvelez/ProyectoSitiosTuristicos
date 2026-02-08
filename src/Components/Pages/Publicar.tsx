import React, {useEffect, useState} from "react";
import {
    Box,
    Grid,
    Paper,
    Typography,
    Stack,
    Divider,
    Chip
} from "@mui/material";

// Iconos
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RestaurantIcon from "@mui/icons-material/DinnerDining";
import HotelIcon from "@mui/icons-material/Hotel";
import MapIcon from "@mui/icons-material/LocationOn";
import LandscapeIcon from '@mui/icons-material/Landscape';
import { message } from "antd"; // Para mostrar alertas bonitas
// Ant Design
import {Button, Form, Input, InputNumber} from "antd";

// Assets y CSS
import BannerImg from "../../Layouts/Images/Banner.png";
import "./styles/PublicarDestino.css";
import MapaUbicacion from "./Seccions/Localizacionleaf";
import SelectorImagenes from "./Seccions/SelectorImages"; // Importamos el nuevo CSS
import {guardarDestino} from "../../services/lugaresService";

const PublicarDestino = () => {
    const [form] = Form.useForm();

    const [preview, setPreview] = useState({
        nombre: "Título del Destino",
        descripcion: "Aquí aparecerá la descripción que escribas...",
        pais: "País",
        categoria: "restaurante",
        minimo: 0,
        maximo: 0
    });

    const handleValuesChange = (_: any, allValues: any) => {
        setPreview({...preview, ...allValues});
    };
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [fotosLugar, setFotosLugar] = useState<(File | null)[]>([]);
    const [cargando, setCargando] = useState(false);

    const handleMapUpdate = (lat: number, lng: number, nombre: string) => {
        setUserLocation({ lat, lng });
        // Opcional: Si quieres actualizar el nombre en el formulario automáticamente
        form.setFieldsValue({ pais: nombre });
    };
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {

                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    console.log(userLocation?.lat, userLocation?.lng);
                },
                (error) => {
                    console.error("Error obteniendo ubicación:", error.message);
                }
            );
        }
    }, []);


    const onFinish = async () => {
        try {
            // Validar que el formulario esté ok
            const values = await form.validateFields();

            // Validar que tengamos ubicación del mapa
            if (!userLocation) {
                return message.error("Por favor, selecciona una ubicación en el mapa");
            }
            const archivosValidos = fotosLugar.filter((f): f is File => f !== null);

            // Validar que haya fotos
            if (archivosValidos.filter(f => f !== null).length === 0) {
                return message.warning("Sube al menos una foto del destino");
            }

            setCargando(true);

            // Llamada al nuevo servicio
            await guardarDestino(
                values,
                archivosValidos,
                userLocation
            );

            message.success("¡Destino y fotos guardados correctamente!");

            // Limpiar todo tras el éxito
            form.resetFields();
            setFotosLugar([]);
            // Si tienes una función para resetear el mapa, llámala aquí

        } catch (error) {
            console.error(error);
            message.error("Hubo un error al procesar el registro");
        } finally {
            setCargando(false);
        }
    };

    return (
        <Box className="publicar-container">

            <Box className="header-crear">
                <Typography variant="h3" className="header-title">
                    Crear Nuevo Destino
                </Typography>
            </Box>

            <Box sx={{px: {xs: 2, md: 8}}}>
                <Grid container spacing={5}>

                    {/* FORMULARIO */}
                    <Grid item xs={12} md={7}>
                        <Paper className="form-paper">
                            <Form
                                form={form}
                                layout="vertical"
                                onValuesChange={handleValuesChange}
                                initialValues={{categoria: 'restaurante'}}
                            >
                                <Typography variant="h5" fontWeight="800" sx={{mb: 3}}>Detalles del Lugar</Typography>

                                <Form.Item name="nombre" label={<strong>Nombre del Destino</strong>}>
                                    <Input placeholder="Ej: Parque Nacional Natural Tayrona" size="large"/>
                                </Form.Item>

                                <Form.Item name="descripcion" label={<strong>Descripción</strong>}>
                                    <Input.TextArea rows={4} placeholder="Describe qué hace especial a este lugar..."/>
                                </Form.Item>

                                <Typography variant="body1" fontWeight="bold" sx={{mb: 1}}>Galería de Fotos</Typography>


                                <SelectorImagenes
                                    cantidad={6}
                                    label="Galería del Sitio"
                                    onFilesChange={(files) => setFotosLugar(files)}
                                />

                                <Typography variant="body1" fontWeight="bold" sx={{mb: 2}}>Categoría
                                    Principal</Typography>
                                <Form.Item name="categoria">
                                    <Stack direction="row" spacing={2}>
                                        <button
                                            type="button"
                                            className={`btn-pill ${preview.categoria === "restaurante" ? "active" : ""}`}
                                            onClick={() => form.setFieldsValue({categoria: "restaurante"})}
                                        >
                                            Restaurante <RestaurantIcon sx={{ml: 1, color: "orange"}}/>
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-pill ${preview.categoria === "hotel" ? "active" : ""}`}
                                            onClick={() => form.setFieldsValue({categoria: "hotel"})}
                                        >
                                            Hotel <HotelIcon sx={{ml: 1, color: "red"}}/>
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-pill ${preview.categoria === "aventura" ? "active" : ""}`}
                                            onClick={() => form.setFieldsValue({categoria: "aventura"})}
                                        >
                                            Aventura <LandscapeIcon sx={{ml: 1, color: "green"}}/>
                                        </button>
                                    </Stack>
                                </Form.Item>

                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Form.Item name="pais" label={<strong>País / Ciudad</strong>}>
                                            <Input placeholder="Colombia" prefix={<MapIcon sx={{fontSize: 18}}/>}/>
                                        </Form.Item>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Form.Item name="minimo" label={<strong>Precio Referencia (USD)</strong>}>
                                            <InputNumber style={{width: '100%'}} prefix="$"/>
                                        </Form.Item>
                                        <Form.Item name="maximo" label={<strong>Precio Referencia (USD)</strong>}>
                                            <InputNumber style={{width: '100%'}} prefix="$"/>
                                        </Form.Item>
                                    </Grid>
                                </Grid>

                                {userLocation != null &&
                                    <MapaUbicacion
                                        lat={userLocation?.lat || 0}
                                        lng={userLocation?.lng || 0}
                                        nombre=""
                                        onUpdate={handleMapUpdate}
                                    />
                                }

                                <Button
                                    type="primary"
                                    size="large"
                                    block
                                    className="btn-publicar-main"
                                    loading={cargando} // El botón mostrará un spinner mientras sube
                                    onClick={onFinish}
                                >
                                    Publicar Destino Ahora
                                </Button>

                            </Form>
                        </Paper>
                    </Grid>

                    {/* VISTA PREVIA STICKY */}
                    <Grid item xs={12} md={5}>
                        <Box className="preview-sticky">
                            <Typography variant="h6" fontWeight="800" sx={{mb: 2, color: "#666"}}>Vista
                                Previa</Typography>

                            <Paper className="preview-card">
                                <Box className="preview-img-container">
                                    <img src={BannerImg} alt="Preview"/>
                                </Box>

                                <Box sx={{p: 4}}>
                                    <Typography variant="overline" color="primary" fontWeight="bold">
                                        {preview.pais || "PAÍS"}
                                    </Typography>

                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start"
                                           sx={{mb: 1}}>
                                        <Typography variant="h5" fontWeight="900">
                                            {preview.nombre || "Nombre del Destino"}
                                        </Typography>
                                        <Chip label="NUEVO"
                                              sx={{bgcolor: "#4dbce9", color: "white", fontWeight: "bold"}}/>
                                    </Stack>

                                    <Typography variant="body2" color="text.secondary" sx={{mb: 3}}>
                                        {preview.descripcion || "Descripción del lugar..."}
                                    </Typography>

                                    <Divider sx={{my: 2}}/>

                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Precio
                                                sugerido</Typography>
                                            <Typography variant="h6" fontWeight="bold" color="primary">
                                                ${preview.minimo || 0} USD
                                            </Typography>
                                            <Typography variant="h6" fontWeight="bold" color="primary">
                                                ${preview.maximo || 0} USD
                                            </Typography>
                                        </Box>
                                        <button className="btn-ver-mas-grande" style={{padding: '10px 25px'}}>
                                            Ver Detalles
                                        </button>
                                    </Stack>
                                </Box>
                            </Paper>

                            <div className="info-note">
                                <Typography variant="caption" color="#039be5" fontWeight="bold">
                                    * Así es como aparecerá tu destino en el buscador principal.
                                </Typography>
                            </div>
                        </Box>
                    </Grid>

                </Grid>
            </Box>
        </Box>
    );
};

export default PublicarDestino;