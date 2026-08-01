import React, { useEffect, useState } from "react";
import {
    Box,
    Grid,
    Paper,
    Typography,
    Stack,
    Divider,
    Chip,
    IconButton
} from "@mui/material";

// Iconos MUI
import RestaurantIcon from "@mui/icons-material/DinnerDining";
import HotelIcon from "@mui/icons-material/Hotel";
import MapIcon from "@mui/icons-material/LocationOn";
import LandscapeIcon from '@mui/icons-material/Landscape';
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ShieldIcon from '@mui/icons-material/Shield';
import VerifiedIcon from '@mui/icons-material/Verified';
import AccessibleIcon from '@mui/icons-material/Accessible';
import PetsIcon from '@mui/icons-material/Pets';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

// Ant Design Components
import { Button, Form, Input, InputNumber, Checkbox, Switch, Select, Tooltip, message } from "antd";

// Assets y Componentes Locales
import BannerImg from "../../Layouts/Images/Banner.png";
import "./styles/PublicarDestino.css";
import MapaUbicacion from "./Seccions/Localizacionleaf";
import SelectorImagenes from "./Seccions/SelectorImages";
import { guardarDestino } from "../../services/lugaresService";

// Listas de Opciones
const OPCIONES_ACTIVIDADES = [
    { label: '🥾 Senderismo', value: 'senderismo' },
    { label: '🦜 Avistamiento de Aves', value: 'avistamiento_aves' },
    { label: '🌊 Deportes Acuáticos', value: 'deportes_acuaticos' },
    { label: '☕ Catación / Gastronomía', value: 'gastronomia' },
    { label: '📸 Fotografía', value: 'fotografia' },
    { label: '⛺ Camping / Glamping', value: 'camping' },
    { label: '🏛️ Tour Cultural', value: 'cultural' },
];

const OPCIONES_SERVICIOS = [
    { label: '📶 Wi-Fi Gratis', value: 'wifi' },
    { label: '🚗 Parqueadero Privado', value: 'parqueadero' },
    { label: '🍽️ Restaurante', value: 'restaurante_sitio' },
    { label: '🗣️ Guía Bilingüe', value: 'guia_bilingue' },
    { label: '🚻 Baños Públicos', value: 'banos' },
];

const PublicarDestino = () => {
    const [form] = Form.useForm();

    // Estado expandido para la Vista Previa
    const [preview, setPreview] = useState({
        nombre: "Título del Destino",
        descripcion: "Aquí aparecerá la descripción que escribas...",
        ciudad: "Ciudad",
        categoria: "aventura",
        minimo: 0,
        rnt: "",
        unescoId: "",
        actividades: [] as string[],
        servicios: [] as string[],
        petFriendly: false,
        accesibleSillaRuedas: false,
        dificultad: "Baja",
        contactoWhatsapp: "",
        queLlevar: ""
    });

    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [fotosLugar, setFotosLugar] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [imgActualIndex, setImgActualIndex] = useState<number>(0);
    const [cargando, setCargando] = useState(false);

    const handleValuesChange = (_: any, allValues: any) => {
        setPreview(prev => ({ ...prev, ...allValues }));
    };

    // Generar URLs temporales para el carrusel
    useEffect(() => {
        if (fotosLugar.length === 0) {
            setPreviewUrls([]);
            setImgActualIndex(0);
            return;
        }

        const urls = fotosLugar.map(file => URL.createObjectURL(file));
        setPreviewUrls(urls);

        if (imgActualIndex >= fotosLugar.length) {
            setImgActualIndex(0);
        }

        return () => {
            urls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [fotosLugar]);

    const handlePrevFoto = () => {
        setImgActualIndex((prev) => (prev === 0 ? previewUrls.length - 1 : prev - 1));
    };

    const handleNextFoto = () => {
        setImgActualIndex((prev) => (prev === previewUrls.length - 1 ? 0 : prev + 1));
    };

    const handleMapUpdate = (lat: number, lng: number, nombre: string) => {
        setUserLocation({ lat, lng });
        form.setFieldsValue({ ciudad: nombre });
        setPreview(prev => ({ ...prev, ciudad: nombre }));
    };

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Error obteniendo ubicación:", error.message);
                }
            );
        }
    }, []);

    const onFinish = async () => {
        try {
            const values = await form.validateFields();

            if (!userLocation) {
                return message.error("Por favor, selecciona una ubicación en el mapa");
            }

            if (fotosLugar.length === 0) {
                return message.warning("Sube al menos una foto del destino");
            }

            setCargando(true);

            await guardarDestino(
                values,
                fotosLugar,
                userLocation
            );

            message.success("¡Destino y fotos guardados correctamente!");

            form.resetFields();
            setFotosLugar([]);

        } catch (error) {
            console.error(error);
            message.error("Hubo un error al procesar el registro");
        } finally {
            setCargando(false);
        }
    };

    const getCategoryBadge = (cat: string) => {
        switch (cat) {
            case 'hotel':
                return { label: 'Hotel', icon: <HotelIcon sx={{ fontSize: 16, color: '#ef4444' }} /> };
            case 'aventura':
                return { label: 'Aventura', icon: <LandscapeIcon sx={{ fontSize: 16, color: '#10b981' }} /> };
            default:
                return { label: 'Restaurante', icon: <RestaurantIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> };
        }
    };

    const catBadge = getCategoryBadge(preview.categoria);

    // Validación estricta: Solo 'hotel' o 'restaurante' activan WhatsApp
    const esHotelORestaurante = preview.categoria === "hotel" || preview.categoria === "restaurante";
    return (
        <Box className="publicar-container" sx={{ pb: 8 }}>

            {/* BANNER PRINCIPAL */}
            <Paper
                elevation={0}
                sx={{
                    background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
                    borderRadius: "0 0 40px 40px",
                    color: "#ffffff",
                    py: { xs: 5, md: 6 },
                    px: { xs: 3, md: 8 },
                    mb: 5,
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 20px 40px rgba(14, 165, 233, 0.2)"
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        top: "-50%",
                        right: "-10%",
                        width: "450px",
                        height: "450px",
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.12)",
                        filter: "blur(50px)",
                        pointerEvents: "none"
                    }}
                />

                <Box sx={{ maxWidth: "800px", mx: "auto", textAlign: "center", position: "relative", zIndex: 1 }}>
                    <Chip
                        label="PANEL DE PUBLICACIÓN"
                        size="small"
                        sx={{
                            bgcolor: "rgba(255, 255, 255, 0.22)",
                            backdropFilter: "blur(8px)",
                            color: "#ffffff",
                            fontWeight: "800",
                            fontSize: "0.75rem",
                            letterSpacing: "1.2px",
                            mb: 2,
                            px: 1
                        }}
                    />
                    <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: "2rem", md: "2.75rem" }, mb: 1.5 }}>
                        Crear Nuevo Destino
                    </Typography>
                    <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.92)", maxWidth: "580px", mx: "auto" }}>
                        Completa los detalles y añade este lugar a la plataforma para que la comunidad pueda descubrirlo.
                    </Typography>
                </Box>
            </Paper>

            <Box sx={{ px: { xs: 2, md: 8 } }}>
                <Grid container spacing={5}>

                    {/* FORMULARIO */}
                    <Grid item xs={12} md={7}>
                        <Paper className="form-paper">
                            <Form
                                form={form}
                                layout="vertical"
                                onValuesChange={handleValuesChange}
                                initialValues={{ categoria: 'restaurante', dificultad: 'Baja' }}
                            >
                                <Typography variant="h5" fontWeight="800" sx={{ mb: 3, color: "#0f172a" }}>
                                    Detalles del Lugar
                                </Typography>

                                <Form.Item name="nombre" label={<strong>Nombre del Destino</strong>}>
                                    <Input placeholder="Ej: Parque Nacional Natural Tayrona" size="large" />
                                </Form.Item>

                                <Form.Item name="descripcion" label={<strong>Descripción</strong>}>
                                    <Input.TextArea rows={4} placeholder="Describe qué hace especial a este lugar..." />
                                </Form.Item>

                                <SelectorImagenes
                                    cantidad={6}
                                    label="Galería del Sitio"
                                    onFilesChange={(files) => setFotosLugar(files)}
                                />

                                <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                                    Categoría Principal
                                </Typography>
                                <Form.Item name="categoria">
                                    <Stack direction="row" spacing={2}>
                                        <button
                                            type="button"
                                            className={`btn-pill ${preview.categoria === "aventura" ? "active" : ""}`}
                                            onClick={() => {
                                                form.setFieldsValue({ categoria: "aventura" });
                                                setPreview(p => ({ ...p, categoria: "aventura" }));
                                            }}
                                        >
                                            Aventura <LandscapeIcon sx={{ ml: 1, color: "green" }} />
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-pill ${preview.categoria === "restaurante" ? "active" : ""}`}
                                            onClick={() => {
                                                form.setFieldsValue({ categoria: "restaurante" });
                                                setPreview(p => ({ ...p, categoria: "restaurante" }));
                                            }}
                                        >
                                            Restaurante <RestaurantIcon sx={{ ml: 1, color: "orange" }} />
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-pill ${preview.categoria === "hotel" ? "active" : ""}`}
                                            onClick={() => {
                                                form.setFieldsValue({ categoria: "hotel" });
                                                setPreview(p => ({ ...p, categoria: "hotel" }));
                                            }}
                                        >
                                            Hotel <HotelIcon sx={{ ml: 1, color: "red" }} />
                                        </button>

                                    </Stack>
                                </Form.Item>

                                {/* 🛡️ SECCIÓN 1: VERIFICACIÓN OFICIAL */}
                                <Divider sx={{ my: 3 }} />
                                <Typography variant="subtitle1" fontWeight="800" sx={{ mb: 2, color: "#0284c7", display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ShieldIcon color="primary" /> Verificación y Registro Oficial
                                </Typography>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Form.Item
                                            name="rnt"
                                            label={
                                                <span>
                                                    <strong>RNT (Registro Nac. de Turismo)</strong>{" "}
                                                    <Tooltip title="Número de registro oficial del prestador turístico en Colombia">
                                                        <Typography component="span" variant="caption" color="text.secondary">(?)</Typography>
                                                    </Tooltip>
                                                </span>
                                            }
                                        >
                                            <Input placeholder="Ej: 45892" prefix={<VerifiedIcon sx={{ fontSize: 16, color: '#0ea5e9' }} />} />
                                        </Form.Item>
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <Form.Item name="unescoId" label={<strong>Código UNESCO (Si aplica)</strong>}>
                                            <Input placeholder="Ej: UNESCO-123" />
                                        </Form.Item>
                                    </Grid>
                                </Grid>

                                {/* 🎯 SECCIÓN 2: ACTIVIDADES DISPONIBLES */}
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="subtitle1" fontWeight="800" sx={{ mb: 1.5, color: "#0f172a" }}>
                                    🎯 Actividades Disponibles
                                </Typography>
                                <Form.Item name="actividades">
                                    <Checkbox.Group
                                        options={OPCIONES_ACTIVIDADES}
                                        style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}
                                    />
                                </Form.Item>

                                {/* 🛠️ SECCIÓN 3: SERVICIOS E INCLUSIVIDAD */}
                                <Typography variant="subtitle1" fontWeight="800" sx={{ mt: 2, mb: 1.5, color: "#0f172a" }}>
                                    🛠️ Servicios en el Sitio
                                </Typography>
                                <Form.Item name="servicios">
                                    <Checkbox.Group
                                        options={OPCIONES_SERVICIOS}
                                        style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}
                                    />
                                </Form.Item>

                                <Stack direction="row" spacing={4} sx={{ mb: 3, bgcolor: '#f8fafc', p: 2, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <Form.Item name="petFriendly" valuePropName="checked" noStyle>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <PetsIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                                            <Typography variant="body2" fontWeight="600">Pet Friendly</Typography>
                                            <Switch size="small" />
                                        </Stack>
                                    </Form.Item>

                                    <Form.Item name="accesibleSillaRuedas" valuePropName="checked" noStyle>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <AccessibleIcon sx={{ color: '#0ea5e9', fontSize: 20 }} />
                                            <Typography variant="body2" fontWeight="600">Acceso Silla de Ruedas</Typography>
                                            <Switch size="small" />
                                        </Stack>
                                    </Form.Item>
                                </Stack>

                                {/* 📋 SECCIÓN 4: INFORMACIÓN DE UBICACIÓN Y PRESUPUESTO */}
                                <Divider sx={{ my: 3 }} />
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Form.Item name="ciudad" label={<strong>Ciudad / Municipio</strong>}>
                                            <Input placeholder="Cali, Colombia" prefix={<MapIcon sx={{ fontSize: 18 }} />} />
                                        </Form.Item>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Form.Item name="minimo" label={<strong>Presupuesto Recomendado (Mínimo)</strong>}>
                                            <InputNumber style={{ width: '100%' }} prefix="$" />
                                        </Form.Item>
                                    </Grid>
                                </Grid>

                                {/* SECCIÓN 5: DIFICULTAD Y CONTACTO */}
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Form.Item name="dificultad" label={<strong>Nivel de Dificultad</strong>}>
                                            <Select placeholder="Selecciona el nivel">
                                                <Select.Option value="Baja">🟢 Bajo (Relax / Apto para todos)</Select.Option>
                                                <Select.Option value="Media">🟡 Moderado (Requiere caminata)</Select.Option>
                                                <Select.Option value="Alta">🔴 Exigente (Senderismo avanzado)</Select.Option>
                                            </Select>
                                        </Form.Item>
                                    </Grid>

                                    {/* 🟢 CAMPO WHATSAPP: SOLO VISIBLE SI ES HOTEL O RESTAURANTE */}
                                    {esHotelORestaurante && (
                                        <Grid item xs={12} sm={6}>
                                            <Form.Item name="contactoWhatsapp" label={<strong>WhatsApp de Contacto</strong>}>
                                                <Input placeholder="Ej: +57 111 112 4455" prefix={<WhatsAppIcon sx={{ fontSize: 18, color: '#22c55e' }} />} />
                                            </Form.Item>
                                        </Grid>
                                    )}

                                    <Grid item xs={12}>
                                        <Form.Item name="queLlevar" label={<strong>¿Qué se recomienda llevar?</strong>}>
                                            <Input placeholder="Ej: Calzado de agarre, repelente de insectos, chaqueta impermeable, hidratación..." />
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
                                    loading={cargando}
                                    onClick={onFinish}
                                    style={{ marginTop: '20px' }}
                                >
                                    Publicar Destino Ahora
                                </Button>

                            </Form>
                        </Paper>
                    </Grid>

                    {/* VISTA PREVIA STICKY */}
                    <Grid item xs={12} md={5}>
                        <Box className="preview-sticky">
                            <Typography variant="h6" fontWeight="800" sx={{ mb: 2, color: "#475569" }}>
                                Vista Previa
                            </Typography>

                            <Paper
                                elevation={0}
                                sx={{
                                    borderRadius: "24px",
                                    overflow: "hidden",
                                    boxShadow: "0 12px 32px rgba(77, 188, 233, 0.15)",
                                    border: "1px solid #e2e8f0",
                                    bgcolor: "#ffffff"
                                }}
                            >
                                {/* CARRUSEL DE IMÁGENES */}
                                <Box sx={{ position: "relative", height: "240px", overflow: "hidden" }}>
                                    <img
                                        src={previewUrls.length > 0 ? previewUrls[imgActualIndex] : BannerImg}
                                        alt="Preview"
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />

                                    {/* Insignias Flotantes en la Imagen */}
                                    <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 14, right: 14 }}>
                                        {preview.rnt && (
                                            <Chip
                                                icon={<VerifiedIcon style={{ color: 'white', fontSize: 14 }} />}
                                                label={`RNT ${preview.rnt}`}
                                                size="small"
                                                sx={{ bgcolor: "#10b981", color: "white", fontWeight: "800", fontSize: "0.65rem" }}
                                            />
                                        )}
                                        <Chip
                                            label="NUEVO"
                                            size="small"
                                            sx={{ bgcolor: "#4dbce9", color: "white", fontWeight: "800", fontSize: "0.7rem" }}
                                        />
                                    </Stack>

                                    {/* Insignia Categoría */}
                                    <Chip
                                        icon={catBadge.icon}
                                        label={catBadge.label}
                                        size="small"
                                        sx={{
                                            position: "absolute",
                                            bottom: 14,
                                            left: 14,
                                            bgcolor: "rgba(255, 255, 255, 0.92)",
                                            backdropFilter: "blur(4px)",
                                            color: "#1e293b",
                                            fontWeight: "700"
                                        }}
                                    />

                                    {/* Flechas del Carrusel */}
                                    {previewUrls.length > 1 && (
                                        <>
                                            <IconButton onClick={handlePrevFoto} size="small" sx={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", bgcolor: "rgba(255,255,255,0.85)" }}>
                                                <ArrowBackIosNewIcon fontSize="small" />
                                            </IconButton>

                                            <IconButton onClick={handleNextFoto} size="small" sx={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", bgcolor: "rgba(255,255,255,0.85)" }}>
                                                <ArrowForwardIosIcon fontSize="small" />
                                            </IconButton>

                                            <Chip
                                                label={`${imgActualIndex + 1} / ${previewUrls.length}`}
                                                size="small"
                                                sx={{ position: "absolute", bottom: 14, right: 14, bgcolor: "rgba(15, 23, 42, 0.7)", color: "white", fontWeight: "bold" }}
                                            />
                                        </>
                                    )}
                                </Box>

                                {/* DETALLES DEL DESTINO EN VISTA PREVIA */}
                                <Box sx={{ p: 3.5 }}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <LocationOnIcon sx={{ fontSize: 16, color: "#4dbce9" }} />
                                            <Typography variant="caption" fontWeight="800" sx={{ color: "#4dbce9", textTransform: "uppercase" }}>
                                                {preview.ciudad || "CIUDAD"}
                                            </Typography>
                                        </Stack>

                                        {/* Nivel de Dificultad Badge */}
                                        <Chip
                                            label={`Dificultad: ${preview.dificultad}`}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontSize: "0.65rem", fontWeight: "700", borderColor: "#cbd5e1" }}
                                        />
                                    </Stack>

                                    {/* Título */}
                                    <Typography variant="h5" sx={{ fontWeight: "800", color: "#0f172a", fontSize: "1.35rem", mb: 1 }}>
                                        {preview.nombre || "Título del Destino"}
                                    </Typography>

                                    {/* Descripción */}
                                    <Typography variant="body2" sx={{ color: "#64748b", fontSize: "0.88rem", mb: 2 }}>
                                        {preview.descripcion || "Aquí aparecerá la descripción que escribas..."}
                                    </Typography>

                                    {/* ETIQUETAS DE ACTIVIDADES */}
                                    {preview.actividades && preview.actividades.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight="700" display="block" sx={{ mb: 0.5 }}>
                                                ACTIVIDADES:
                                            </Typography>
                                            <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                                {preview.actividades.map((act) => {
                                                    const itemOp = OPCIONES_ACTIVIDADES.find(o => o.value === act);
                                                    return (
                                                        <Chip
                                                            key={act}
                                                            label={itemOp ? itemOp.label : act}
                                                            size="small"
                                                            sx={{ bgcolor: "#f1f5f9", fontSize: "0.7rem", fontWeight: "600", color: "#334155" }}
                                                        />
                                                    );
                                                })}
                                            </Stack>
                                        </Box>
                                    )}

                                    {/* ATRIBUTOS INCLUSIVOS (Pet Friendly & Silla de Ruedas) */}
                                    {(preview.petFriendly || preview.accesibleSillaRuedas) && (
                                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                            {preview.petFriendly && (
                                                <Chip
                                                    icon={<PetsIcon style={{ fontSize: 14, color: '#d97706' }} />}
                                                    label="Pet Friendly"
                                                    size="small"
                                                    sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: "700", fontSize: "0.68rem" }}
                                                />
                                            )}
                                            {preview.accesibleSillaRuedas && (
                                                <Chip
                                                    icon={<AccessibleIcon style={{ fontSize: 14, color: '#0284c7' }} />}
                                                    label="Accesible"
                                                    size="small"
                                                    sx={{ bgcolor: "#e0f2fe", color: "#075985", fontWeight: "700", fontSize: "0.68rem" }}
                                                />
                                            )}
                                        </Stack>
                                    )}

                                    <Divider sx={{ my: 2, borderColor: "#f1f5f9" }} />

                                    {/* PRESUPUESTO Y BOTÓN DE WHATSAPP CONDICIONAL */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: "600", display: "block" }}>
                                                Presupuesto recomendado
                                            </Typography>
                                            <Typography variant="h6" fontWeight="900" sx={{ color: "#0ea5e9" }}>
                                                ${Number(preview.minimo || 0).toLocaleString("es-CO")}{" "}
                                                <Typography component="span" variant="caption" fontWeight="700" color="text.secondary">
                                                    COP
                                                </Typography>
                                            </Typography>
                                        </Box>

                                        {/* 🟢 BOTÓN WHATSAPP: SOLO APARECE EN HOTEL O RESTAURANTE SI REGISTRÓ NÚMERO */}
                                        {esHotelORestaurante && (
                                            <Chip
                                                icon={<WhatsAppIcon style={{ color: 'white', fontSize: 16 }} />}
                                                label="WhatsApp"
                                                component="a"
                                                href={`https://wa.me/${preview.contactoWhatsapp.replace(/[^0-9]/g, '')}`}
                                                target="_blank"
                                                clickable
                                                sx={{
                                                    bgcolor: "#22c55e",
                                                    color: "white",
                                                    fontWeight: "800",
                                                    fontSize: "0.75rem",
                                                    px: 1,
                                                    '&:hover': { bgcolor: "#16a34a" }
                                                }}
                                            />
                                        )}
                                    </Stack>
                                </Box>
                            </Paper>

                            <div className="info-note" style={{ marginTop: "16px" }}>
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