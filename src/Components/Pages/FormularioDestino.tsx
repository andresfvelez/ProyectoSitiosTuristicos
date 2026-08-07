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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { useNavigate } from 'react-router-dom';
// Ant Design Components
import { Button, Form, Input, InputNumber, Checkbox, Switch, Select, Tooltip, message, Popconfirm } from "antd";

// Assets y Componentes Locales
import BannerImg from "../../Layouts/Images/Banner.png";
import "./styles/PublicarDestino.css";
import MapaUbicacion from "./Seccions/Localizacionleaf";
import SelectorImagenes from "./Seccions/SelectorImages";
import { guardarDestino, actualizarDestino, confirmarDestino, rechazarDestino, obtenerImagenesPorDestino } from "../../services/lugaresService";
import { LugarTuristico } from "../models/LugarTuristico";
import { buscarPosiblesDuplicados } from "../../services/ValidacionLugar";
import {
    OPCIONES_CLIMA,
    OPCIONES_ENTORNO,
    OPCIONES_PRESUPUESTO,
    OPCIONES_ACCESO,
    OPCIONES_RITMO,
    OPCIONES_COMPANIA,
    OPCIONES_ACTIVIDADES,
    OPCIONES_HOTEL,
    OPCIONES_RESTAURANTE,
    OPCIONES_SERVICIOS,
    obtenerLabelFormateado
} from "../models/OpcionesDestinos";
import { obtenerCiudadesColombia } from "../../services/ApiServices";

interface FormularioDestinoProps {
    modo: 'crear' | 'editar' | 'aprobar';
    datosIniciales?: LugarTuristico;
    usuarioActualId?: string;
    onExito?: () => void;
}

message.config({
    top: 80,
    duration: 3,
    maxCount: 3,
});

const normalizarTexto = (texto: string) =>
    texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const FormularioDestino: React.FC<FormularioDestinoProps> = ({
                                                                        modo,
                                                                        datosIniciales,
                                                                        usuarioActualId = "",
                                                                        onExito
                                                                    }) => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [cargando, setCargando] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
        datosIniciales ? { lat: datosIniciales.latitud, lng: datosIniciales.longitud } : null
    );
    const [fotosLugar, setFotosLugar] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>(datosIniciales?.imagenes || []);
    const [imgActualIndex, setImgActualIndex] = useState<number>(0);
    const [posiblesDuplicados, setPosiblesDuplicados] = useState<{ lugar: LugarTuristico; motivo: string }[]>([]);
    const [cargandoDuplicados, setCargandoDuplicados] = useState<boolean>(false);

    const [listaCiudades, setListaCiudades] = useState<{ label: string; value: string }[]>([]);
    const [cargandoCiudades, setCargandoCiudades] = useState<boolean>(false);
    const [nombreMapaTemp, setNombreMapaTemp] = useState<string>(datosIniciales?.ciudad || "");
    const [mapKey, setMapKey] = useState<number>(Date.now());

    const [preview, setPreview] = useState<any>({
        nombre: datosIniciales?.nombre || "Título del Destino",
        descripcion: datosIniciales?.descripcion || "Aquí aparecerá la descripción que escribas...",
        ciudad: datosIniciales?.ciudad || "Ciudad",
        categoria: datosIniciales?.categoria || "aventura",
        minimo: datosIniciales?.minimo || 0,
        pais: datosIniciales?.pais || "Colombia",
        latitud: datosIniciales?.latitud || 0,
        longitud: datosIniciales?.longitud || 0,
        rnt: datosIniciales?.rnt || "",
        unescoId: datosIniciales?.unescoId || "",
        nit: datosIniciales?.nit || "",
        tagsEspeciales: datosIniciales?.tagsEspeciales || [],
        servicios: datosIniciales?.servicios || [],
        petFriendly: datosIniciales?.petFriendly === true || (datosIniciales as any)?.petFriendly === "true",
        accesibleSillaRuedas: datosIniciales?.accesibleSillaRuedas === true || (datosIniciales as any)?.accesibleSillaRuedas === "true",
        dificultad: datosIniciales?.dificultad || "Baja",
        contactoWhatsapp: datosIniciales?.contactoWhatsapp || "",
        queLlevar: datosIniciales?.queLlevar || "",
        puntuacion: datosIniciales?.puntuacion || 0,

        clima: (datosIniciales as any)?.clima || "calido",
        entorno: (datosIniciales as any)?.entorno || "naturaleza",
        rangoPresupuesto: (datosIniciales as any)?.rangoPresupuesto || "economico",
        tipoAcceso: (datosIniciales as any)?.tipoAcceso || "carro",
        ritmo: (datosIniciales as any)?.ritmo || "relax",
        companiaIdeal: (datosIniciales as any)?.companiaIdeal || []
    });

    const getImagenSrc = (src: string) => {
        if (!src) return BannerImg;
        if (src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:image')) {
            return src;
        }
        return `data:image/png;base64,${src}`;
    };

    useEffect(() => {
        const fetchCiudades = async () => {
            setCargandoCiudades(true);
            const opciones = await obtenerCiudadesColombia();
            setListaCiudades(opciones);
            setCargandoCiudades(false);
        };

        fetchCiudades();
    }, []);

    useEffect(() => {
        if (datosIniciales) {
            const isPetFriendly = datosIniciales.petFriendly === true || (datosIniciales as any).petFriendly === "true";
            const isAccesible = datosIniciales.accesibleSillaRuedas === true || (datosIniciales as any).accesibleSillaRuedas === "true";

            const datosNormalizados = {
                ...datosIniciales,
                petFriendly: isPetFriendly,
                accesibleSillaRuedas: isAccesible,
                clima: (datosIniciales as any).clima || "calido",
                entorno: (datosIniciales as any).entorno || "naturaleza",
                rangoPresupuesto: (datosIniciales as any).rangoPresupuesto || "economico",
                tipoAcceso: (datosIniciales as any).tipoAcceso || "carro",
                ritmo: (datosIniciales as any).ritmo || "relax",
                companiaIdeal: (datosIniciales as any).companiaIdeal || []
            };

            form.setFieldsValue(datosNormalizados);
            setPreview(datosNormalizados);
            setNombreMapaTemp(datosIniciales.ciudad || "");

            if (datosIniciales.latitud && datosIniciales.longitud) {
                setUserLocation({ lat: datosIniciales.latitud, lng: datosIniciales.longitud });
            }

            const fetchImagenes = async () => {
                if (datosIniciales.imagenes && datosIniciales.imagenes.length > 0) {
                    setPreviewUrls(datosIniciales.imagenes);
                } else if (datosIniciales.id) {
                    const fotosBase64 = await obtenerImagenesPorDestino(datosIniciales.id);
                    if (fotosBase64 && fotosBase64.length > 0) {
                        setPreviewUrls(fotosBase64);
                    }
                }
            };

            fetchImagenes();
        }
    }, [datosIniciales, form]);

    const handleValuesChange = (_: any, allValues: any) => {
        setPreview((prev: any) => ({ ...prev, ...allValues }));
    };

    useEffect(() => {
        if (modo === 'crear' && navigator.geolocation) {
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
    }, [modo]);

    useEffect(() => {
        if (modo === 'aprobar' && datosIniciales) {
            setCargandoDuplicados(true);
            buscarPosiblesDuplicados(datosIniciales).then((res) => {
                setPosiblesDuplicados(res);
                setCargandoDuplicados(false);
            });
        }
    }, [modo, datosIniciales]);

    useEffect(() => {
        if (fotosLugar.length > 0) {
            const urls = fotosLugar.map(file => URL.createObjectURL(file));
            setPreviewUrls(urls);
            setImgActualIndex(0);
            return () => urls.forEach(url => URL.revokeObjectURL(url));
        }
    }, [fotosLugar]);

    const handlePrevFoto = () => {
        setImgActualIndex((prev) => (prev === 0 ? previewUrls.length - 1 : prev - 1));
    };

    const handleNextFoto = () => {
        setImgActualIndex((prev) => (prev === previewUrls.length - 1 ? 0 : prev + 1));
    };

    const handleMapUpdate = (lat: number, lng: number, nombre: string) => {
        if (modo === 'aprobar') return;
        setUserLocation({ lat, lng });
        setNombreMapaTemp(nombre);

        const ciudadCasilla = form.getFieldValue('ciudad');
        setPreview((prev: any) => ({
            ...prev,
            ciudad: ciudadCasilla || nombre || prev.ciudad,
            latitud: lat,
            longitud: lng
        }));
    };

    const handleSeleccionarCiudad = async (ciudadNombre: string) => {
        form.setFieldsValue({ ciudad: ciudadNombre });
        setPreview((prev: any) => ({ ...prev, ciudad: ciudadNombre }));

        if (!ciudadNombre) return;

        const hideLoading = message.loading(`Buscando ${ciudadNombre} en el mapa...`, 0);

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ciudadNombre)},Colombia`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    const newLat = parseFloat(data[0].lat);
                    const newLng = parseFloat(data[0].lon);

                    setUserLocation({ lat: newLat, lng: newLng });
                    setPreview((prev: any) => ({ ...prev, latitud: newLat, longitud: newLng }));
                    setMapKey(Date.now());

                    hideLoading();
                    message.success(`Ubicación movida a ${ciudadNombre}`);
                } else {
                    hideLoading();
                    message.warning(`No se encontraron coordenadas exactas para ${ciudadNombre}`);
                }
            }
        } catch (e) {
            hideLoading();
            console.error("Error geocodificando la ciudad seleccionada:", e);
            message.error("Hubo un error al conectar con el mapa.");
        }
    };

    const onFinish = async () => {
        try {
            const values = await form.validateFields();

            if (!userLocation) {
                return message.error("Por favor, selecciona una ubicación en el mapa");
            }

            if (modo === 'crear' && fotosLugar.length === 0) {
                return message.warning("Sube al menos una foto del destino");
            }

            const ciudadFinal = values.ciudad?.trim()
                ? values.ciudad.trim()
                : (nombreMapaTemp.trim() || "Colombia");

            const datosLimpios = {
                ...values,
                ciudad: ciudadFinal,
                imagenes: previewUrls
            };

            if (datosLimpios.categoria === "aventura") {
                datosLimpios.nit = "";
                datosLimpios.contactoWhatsapp = "";
            } else {
                datosLimpios.rnt = "";
                datosLimpios.unescoId = "";
                datosLimpios.dificultad = "";
                datosLimpios.queLlevar = "";
            }

            setCargando(true);

            if (modo === 'crear') {
                await guardarDestino(
                    datosLimpios,
                    fotosLugar,
                    userLocation,
                    usuarioActualId
                );
                message.success("¡Destino guardado y enviado a revisión correctamente!");
                form.resetFields();
                setFotosLugar([]);
                navigate('/Destinos');
            } else if (modo === 'editar' && datosIniciales?.id) {
                await actualizarDestino(datosIniciales.id, datosLimpios);
                message.success("¡Destino actualizado correctamente!");
                navigate('/Destinos');
            }

            if (onExito) onExito();

        } catch (error) {
            console.error(error);
            message.error("Hubo un error al procesar el registro");
        } finally {
            setCargando(false);
        }
    };

    const handleAprobarAdmin = async () => {
        if (!datosIniciales?.id) return;
        setCargando(true);
        try {
            await confirmarDestino(datosIniciales.id);
            message.success("¡Destino aprobado y publicado correctamente!");
            if (onExito) onExito();
            navigate('/admin/pendientes');
        } catch (error) {
            console.error(error);
            message.error("Error al aprobar el destino");
            navigate('/admin/pendientes');
        } finally {
            setCargando(false);
        }
    };

    const handleRechazarAdmin = async () => {
        if (!datosIniciales?.id) return;
        setCargando(true);
        try {
            await rechazarDestino(datosIniciales.id);
            message.info("Destino rechazado y eliminado correctamente");
            if (onExito) onExito();
        } catch (error) {
            console.error(error);
            message.error("Error al rechazar el destino");
        } finally {
            setCargando(false);
        }
    };

    const getCategoryBadge = (cat: string) => {
        switch (cat) {
            case 'hotel':
                return { label: 'Hotel', icon: <HotelIcon sx={{ fontSize: 16, color: '#ef4444' }} /> };
            case 'restaurante':
                return { label: 'Restaurante', icon: <RestaurantIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> };
            default:
                return { label: 'Aventura / Atractivo', icon: <LandscapeIcon sx={{ fontSize: 16, color: '#10b981' }} /> };
        }
    };

    const catBadge = getCategoryBadge(preview.categoria);
    const esHotelORestaurante = preview.categoria === "hotel" || preview.categoria === "restaurante";
    const esAventura = preview.categoria === "aventura";

    const getOpcionesCategoria = () => {
        if (preview.categoria === 'hotel') return OPCIONES_HOTEL;
        if (preview.categoria === 'restaurante') return OPCIONES_RESTAURANTE;
        return OPCIONES_ACTIVIDADES;
    };

    const opcionesEspeciales = getOpcionesCategoria();

    return (
        <Box className="publicar-container" sx={{ pb: 8 }}>
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
                <Box sx={{ maxWidth: "800px", mx: "auto", textAlign: "center", position: "relative", zIndex: 1 }}>
                    <Chip
                        label={modo === 'crear' ? "PANEL DE PUBLICACIÓN" : modo === 'editar' ? "MODO EDICIÓN" : "MODERACIÓN ADMIN"}
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
                        {modo === 'crear' && "Crear Nuevo Destino"}
                        {modo === 'editar' && "Editar Destino"}
                        {modo === 'aprobar' && "Revisión de Destino"}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.92)", maxWidth: "580px", mx: "auto" }}>
                        Completa los detalles e información clave para alimentar el recomendador inteligente.
                    </Typography>
                </Box>
            </Paper>

            <Box sx={{ px: { xs: 2, md: 8 } }}>
                <Grid container spacing={5}>
                    <Grid item xs={12} md={7}>
                        <Paper className="form-paper">
                            <Form
                                form={form}
                                layout="vertical"
                                onValuesChange={handleValuesChange}
                                disabled={modo === 'aprobar'}
                                initialValues={{
                                    categoria: 'aventura',
                                    dificultad: 'Baja',
                                    clima: 'calido',
                                    entorno: 'naturaleza',
                                    rangoPresupuesto: 'economico',
                                    tipoAcceso: 'carro',
                                    ritmo: 'relax',
                                    companiaIdeal: [],
                                    petFriendly: false,
                                    accesibleSillaRuedas: false
                                }}
                            >
                                <Typography variant="h5" fontWeight="800" sx={{ mb: 3, color: "#0f172a" }}>
                                    Detalles del Lugar
                                </Typography>

                                <Form.Item name="nombre" label={<strong>Nombre del Destino</strong>} rules={[{ required: true, message: 'Ingresa el nombre' }]}>
                                    <Input placeholder="Ej: Parque Nacional Natural Tayrona" size="large" />
                                </Form.Item>

                                <Form.Item name="descripcion" label={<strong>Descripción</strong>} rules={[{ required: true, message: 'Ingresa una descripción' }]}>
                                    <Input.TextArea rows={4} placeholder="Describe qué hace especial a este lugar..." />
                                </Form.Item>

                                <SelectorImagenes
                                    cantidad={6}
                                    label="Galería del Sitio"
                                    onFilesChange={(files) => setFotosLugar(files)}
                                />

                                {previewUrls.length > 0 && fotosLugar.length === 0 && (
                                    <Box sx={{ mt: 1.5, mb: 2 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight="700" display="block" sx={{ mb: 1 }}>
                                            🖼️ Imágenes cargadas desde la base de datos ({previewUrls.length}):
                                        </Typography>
                                        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                                            {previewUrls.map((url, idx) => (
                                                <Box
                                                    key={idx}
                                                    component="img"
                                                    src={getImagenSrc(url)}
                                                    alt={`Imágen ${idx + 1}`}
                                                    sx={{
                                                        width: 70,
                                                        height: 70,
                                                        borderRadius: '10px',
                                                        objectFit: 'cover',
                                                        border: idx === imgActualIndex ? '3px solid #0ea5e9' : '1px solid #cbd5e1',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onClick={() => setImgActualIndex(idx)}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                )}

                                <Typography variant="body1" fontWeight="bold" sx={{ mb: 2, mt: 2 }}>
                                    Categoría Principal
                                </Typography>
                                <Form.Item name="categoria">
                                    <Stack direction="row" spacing={2} sx={{ pointerEvents: modo === 'aprobar' ? 'none' : 'auto' }}>
                                        <button
                                            type="button"
                                            className={`btn-pill ${preview.categoria === "aventura" ? "active" : ""}`}
                                            onClick={() => {
                                                form.setFieldsValue({ categoria: "aventura", tagsEspeciales: [] });
                                                setPreview((p: any) => ({ ...p, categoria: "aventura", tagsEspeciales: [] }));
                                            }}
                                        >
                                            Aventura / Sitio <LandscapeIcon sx={{ ml: 1, color: "green" }} />
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-pill ${preview.categoria === "restaurante" ? "active" : ""}`}
                                            onClick={() => {
                                                form.setFieldsValue({ categoria: "restaurante", tagsEspeciales: [] });
                                                setPreview((p: any) => ({ ...p, categoria: "restaurante", tagsEspeciales: [] }));
                                            }}
                                        >
                                            Restaurante <RestaurantIcon sx={{ ml: 1, color: "orange" }} />
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-pill ${preview.categoria === "hotel" ? "active" : ""}`}
                                            onClick={() => {
                                                form.setFieldsValue({ categoria: "hotel", tagsEspeciales: [] });
                                                setPreview((p: any) => ({ ...p, categoria: "hotel", tagsEspeciales: [] }));
                                            }}
                                        >
                                            Hotel <HotelIcon sx={{ ml: 1, color: "red" }} />
                                        </button>
                                    </Stack>
                                </Form.Item>

                                {/* 🌟 SECCIÓN: FILTROS ESTRUCTURALES PARA IA */}
                                <Divider sx={{ my: 3 }} />
                                <Typography variant="subtitle1" fontWeight="800" sx={{ mb: 2, color: "#0284c7" }}>
                                    🎯 Atributos de Perfilamiento para el Motor de IA
                                </Typography>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Form.Item name="clima" label={<strong>Clima Predominante</strong>} rules={[{ required: true }]}>
                                            <Select options={OPCIONES_CLIMA} placeholder="Selecciona el clima" />
                                        </Form.Item>
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <Form.Item name="entorno" label={<strong>Tipo de Entorno</strong>} rules={[{ required: true }]}>
                                            <Select options={OPCIONES_ENTORNO} placeholder="Selecciona el entorno" />
                                        </Form.Item>
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <Form.Item name="rangoPresupuesto" label={<strong>Categoría de Presupuesto</strong>} rules={[{ required: true }]}>
                                            <Select options={OPCIONES_PRESUPUESTO} placeholder="Nivel económico" />
                                        </Form.Item>
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <Form.Item name="tipoAcceso" label={<strong>Facilidad de Acceso</strong>} rules={[{ required: true }]}>
                                            <Select options={OPCIONES_ACCESO} placeholder="Modo de llegada" />
                                        </Form.Item>
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <Form.Item name="ritmo" label={<strong>Ritmo / Exigencia del Plan</strong>} rules={[{ required: true }]}>
                                            <Select options={OPCIONES_RITMO} placeholder="Ritmo recomendado" />
                                        </Form.Item>
                                    </Grid>

                                    {/* 📌 CAMPO COMPAÑÍA IDEAL: ANTD NATIVO CON CHECKBOXES DENTRO DE CADA OPCIÓN */}
                                    <Grid item xs={12} sm={6}>
                                        <Form.Item name="companiaIdeal" label={<strong>Ideal Para (Compañía)</strong>}>
                                            <Select
                                                mode="multiple"
                                                placeholder="Selecciona opciones"
                                                style={{ width: '100%' }}
                                                optionLabelProp="label" // 👈 Muestra solo el texto limpio en las etiquetas seleccionadas
                                            >
                                                {OPCIONES_COMPANIA.map((item) => {
                                                    const seleccionados: string[] = form.getFieldValue('companiaIdeal') || [];
                                                    const estaSeleccionado = seleccionados.includes(item.value);
                                                    return (
                                                        <Select.Option key={item.value} value={item.value} label={item.label}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <Checkbox checked={estaSeleccionado} />
                                                                <span>{item.label}</span>
                                                            </div>
                                                        </Select.Option>
                                                    );
                                                })}
                                            </Select>
                                        </Form.Item>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 3 }} />
                                <Typography variant="subtitle1" fontWeight="800" sx={{ mb: 2, color: "#0284c7", display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ShieldIcon color="primary" /> Verificación y Registro Oficial
                                </Typography>

                                <Grid container spacing={2}>
                                    {esAventura && (
                                        <>
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
                                        </>
                                    )}
                                    {esHotelORestaurante && (
                                        <Grid item xs={12} sm={6}>
                                            <Form.Item
                                                name="nit"
                                                label={
                                                    <span>
                                                        <strong>NIT (Número de Identificación Tributaria)</strong>{" "}
                                                        <Tooltip title="Número de Identificación Tributaria del Local">
                                                            <Typography component="span" variant="caption" color="text.secondary">(?)</Typography>
                                                        </Tooltip>
                                                    </span>
                                                }
                                            >
                                                <Input placeholder="Ej: 45892" prefix={<VerifiedIcon sx={{ fontSize: 16, color: '#0ea5e9' }} />} />
                                            </Form.Item>
                                        </Grid>
                                    )}
                                </Grid>

                                <Divider sx={{ my: 2 }} />
                                <Typography variant="subtitle1" fontWeight="800" sx={{ mb: 1.5, color: "#0f172a" }}>
                                    {preview.categoria === 'hotel' && '🏨 Comodidades del Alojamiento'}
                                    {preview.categoria === 'restaurante' && '🍽️ Especialidad / Tipo de Cocina'}
                                    {preview.categoria === 'aventura' && '🎯 Actividades Disponibles'}
                                </Typography>
                                <Form.Item name="tagsEspeciales">
                                    <Checkbox.Group
                                        options={opcionesEspeciales}
                                        style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}
                                    />
                                </Form.Item>

                                <Typography variant="subtitle1" fontWeight="800" sx={{ mt: 2, mb: 1.5, color: "#0f172a" }}>
                                    🛠️ Servicios Generales
                                </Typography>
                                <Form.Item name="servicios">
                                    <Checkbox.Group
                                        options={OPCIONES_SERVICIOS}
                                        style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}
                                    />
                                </Form.Item>

                                <Stack direction="row" spacing={4} sx={{ mb: 3, bgcolor: '#f8fafc', p: 2, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <PetsIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                                        <Typography variant="body2" fontWeight="600">Pet Friendly</Typography>
                                        <Form.Item name="petFriendly" valuePropName="checked" noStyle>
                                            <Switch
                                                size="small"
                                                onChange={(checked) => setPreview((prev: any) => ({ ...prev, petFriendly: checked }))}
                                            />
                                        </Form.Item>
                                    </Stack>

                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <AccessibleIcon sx={{ color: '#0ea5e9', fontSize: 20 }} />
                                        <Typography variant="body2" fontWeight="600">Acceso Silla de Ruedas</Typography>
                                        <Form.Item name="accesibleSillaRuedas" valuePropName="checked" noStyle>
                                            <Switch
                                                size="small"
                                                onChange={(checked) => setPreview((prev: any) => ({ ...prev, accesibleSillaRuedas: checked }))}
                                            />
                                        </Form.Item>
                                    </Stack>
                                </Stack>

                                <Divider sx={{ my: 3 }} />
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Form.Item name="ciudad" label={<strong>Ciudad / Municipio</strong>}>
                                            <Select
                                                showSearch
                                                allowClear
                                                loading={cargandoCiudades}
                                                placeholder="Busca un municipio..."
                                                options={listaCiudades}
                                                onChange={handleSeleccionarCiudad}
                                                filterOption={(input, option) => {
                                                    if (!input) return true;
                                                    const inputNormal = normalizarTexto(input);
                                                    const labelNormal = normalizarTexto(String(option?.label ?? ''));
                                                    const valueNormal = normalizarTexto(String(option?.value ?? ''));
                                                    return labelNormal.includes(inputNormal) || valueNormal.includes(inputNormal);
                                                }}
                                            />
                                        </Form.Item>
                                    </Grid>

                                    <Grid item xs={6}>
                                        <Form.Item name="minimo" label={<strong>{esHotelORestaurante ? (preview.categoria === "hotel" ? "Precio Promedio Noche" : "Precio Promedio Plato") : "Presupuesto Sugerido (Mínimo)"}</strong>}>
                                            <InputNumber style={{ width: '100%' }} prefix="$" />
                                        </Form.Item>
                                    </Grid>
                                </Grid>

                                <Grid container spacing={2}>
                                    {esAventura && (
                                        <Grid item xs={12} sm={6}>
                                            <Form.Item name="dificultad" label={<strong>Nivel de Dificultad</strong>}>
                                                <Select placeholder="Selecciona el nivel">
                                                    <Select.Option value="Baja">🟢 Bajo (Relax / Apto para todos)</Select.Option>
                                                    <Select.Option value="Media">🟡 Moderado (Requiere caminata)</Select.Option>
                                                    <Select.Option value="Alta">🔴 Exigente (Senderismo avanzado)</Select.Option>
                                                </Select>
                                            </Form.Item>
                                        </Grid>
                                    )}

                                    {esHotelORestaurante && (
                                        <Grid item xs={12} sm={12}>
                                            <Form.Item name="contactoWhatsapp" label={<strong>WhatsApp de Reserva / Contacto</strong>}>
                                                <Input placeholder="Ej: +57 300 123 4567" prefix={<WhatsAppIcon sx={{ fontSize: 18, color: '#22c55e' }} />} />
                                            </Form.Item>
                                        </Grid>
                                    )}

                                    {esAventura && (
                                        <Grid item xs={12}>
                                            <Form.Item name="queLlevar" label={<strong>¿Qué se recomienda llevar?</strong>}>
                                                <Input placeholder="Ej: Calzado de agarre, repelente de insectos, chaqueta impermeable, hidratación..." />
                                            </Form.Item>
                                        </Grid>
                                    )}
                                </Grid>

                                {userLocation != null &&
                                    <MapaUbicacion
                                        key={mapKey}
                                        lat={userLocation?.lat || 0}
                                        lng={userLocation?.lng || 0}
                                        nombre=""
                                        onUpdate={handleMapUpdate}
                                    />
                                }

                            </Form>
                            <Box sx={{ mt: 3 }}>
                                {modo === 'aprobar' ? (
                                    <Stack direction="row" spacing={2}>
                                        <Button
                                            type="primary"
                                            size="large"
                                            block
                                            loading={cargando}
                                            icon={<CheckCircleIcon />}
                                            onClick={handleAprobarAdmin}
                                            style={{ backgroundColor: '#10b981', height: '48px', borderRadius: '10px' }}
                                        >
                                            Aprobar y Publicar
                                        </Button>
                                        <Popconfirm
                                            title="¿Rechazar este destino?"
                                            description="Se eliminará la solicitud de publicación de la base de datos."
                                            onConfirm={handleRechazarAdmin}
                                            okText="Sí, eliminar"
                                            cancelText="Cancelar"
                                        >
                                            <Button danger size="large" block icon={<DeleteIcon />} style={{ height: '48px', borderRadius: '10px' }}>
                                                Rechazar
                                            </Button>
                                        </Popconfirm>
                                    </Stack>
                                ) : (
                                    <Button
                                        type="primary"
                                        size="large"
                                        block
                                        className="btn-publicar-main"
                                        loading={cargando}
                                        onClick={onFinish}
                                        style={{ marginTop: '20px' }}
                                    >
                                        {modo === 'crear' ? 'Publicar Destino Ahora' : 'Guardar Cambios'}
                                    </Button>
                                )}
                            </Box>
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
                                <Box sx={{ position: "relative", height: "240px", overflow: "hidden" }}>
                                    <img
                                        src={previewUrls.length > 0 ? getImagenSrc(previewUrls[imgActualIndex]) : BannerImg}
                                        alt="Preview"
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />

                                    <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 14, right: 14 }}>
                                        {preview.rnt && esAventura && (
                                            <Chip
                                                icon={<VerifiedIcon style={{ color: 'white', fontSize: 14 }} />}
                                                label={`RNT ${preview.rnt}`}
                                                size="small"
                                                sx={{ bgcolor: "#10b981", color: "white", fontWeight: "800", fontSize: "0.65rem" }}
                                            />
                                        )}
                                        {preview.nit && esHotelORestaurante && (
                                            <Chip
                                                icon={<VerifiedIcon style={{ color: 'white', fontSize: 14 }} />}
                                                label={`NIT ${preview.nit}`}
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

                                <Box sx={{ p: 3.5 }}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <LocationOnIcon sx={{ fontSize: 16, color: "#4dbce9" }} />
                                            <Typography variant="caption" fontWeight="800" sx={{ color: "#4dbce9", textTransform: "uppercase" }}>
                                                {preview.ciudad || "CIUDAD"}
                                            </Typography>
                                        </Stack>

                                        {esAventura && (
                                            <Chip
                                                label={`Dificultad: ${preview.dificultad}`}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: "0.65rem", fontWeight: "700", borderColor: "#cbd5e1" }}
                                            />
                                        )}
                                    </Stack>

                                    <Typography variant="h5" sx={{ fontWeight: "800", color: "#0f172a", fontSize: "1.35rem", mb: 1 }}>
                                        {preview.nombre || "Título del Destino"}
                                    </Typography>

                                    <Typography variant="body2" sx={{ color: "#64748b", fontSize: "0.88rem", mb: 2 }}>
                                        {preview.descripcion || "Aquí aparecerá la descripción que escribas..."}
                                    </Typography>

                                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 2 }}>
                                        {preview.clima && (
                                            <Chip
                                                label={obtenerLabelFormateado(preview.clima)}
                                                size="small"
                                                sx={{ bgcolor: "#e0f2fe", color: "#0369a1", fontWeight: "700", fontSize: "0.68rem" }}
                                            />
                                        )}
                                        {preview.entorno && (
                                            <Chip
                                                label={obtenerLabelFormateado(preview.entorno)}
                                                size="small"
                                                sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: "700", fontSize: "0.68rem" }}
                                            />
                                        )}
                                        {preview.tipoAcceso && (
                                            <Chip
                                                label={obtenerLabelFormateado(preview.tipoAcceso)}
                                                size="small"
                                                sx={{ bgcolor: "#f1f5f9", color: "#334155", fontWeight: "700", fontSize: "0.68rem" }}
                                            />
                                        )}
                                    </Stack>

                                    {preview.tagsEspeciales && preview.tagsEspeciales.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight="700" display="block" sx={{ mb: 0.5, textTransform: "uppercase" }}>
                                                {preview.categoria === 'hotel' ? 'COMODIDADES:' : preview.categoria === 'restaurante' ? 'ESPECIALIDAD:' : 'ACTIVIDADES:'}
                                            </Typography>
                                            <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                                {preview.tagsEspeciales.map((tag: string) => (
                                                    <Chip
                                                        key={tag}
                                                        label={obtenerLabelFormateado(tag)}
                                                        size="small"
                                                        sx={{ bgcolor: "#f1f5f9", fontSize: "0.7rem", fontWeight: "600", color: "#334155" }}
                                                    />
                                                ))}
                                            </Stack>
                                        </Box>
                                    )}

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

                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: "600", display: "block" }}>
                                                {esHotelORestaurante ? "Precio estimado" : "Presupuesto recomendado"}
                                            </Typography>
                                            <Typography variant="h6" fontWeight="900" sx={{ color: "#0ea5e9" }}>
                                                ${Number(preview.minimo || 0).toLocaleString("es-CO")}{" "}
                                                <Typography component="span" variant="caption" fontWeight="700" color="text.secondary">
                                                    COP
                                                </Typography>
                                            </Typography>
                                        </Box>

                                        {esHotelORestaurante && Boolean(preview.contactoWhatsapp) && (
                                            <Chip
                                                icon={<WhatsAppIcon style={{ color: 'white', fontSize: 16 }} />}
                                                label="WhatsApp"
                                                component="a"
                                                href={`https://wa.me/${(preview.contactoWhatsapp || '').replace(/[^0-9]/g, '')}`}
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

                            {posiblesDuplicados.map(({ lugar, motivo }) => (
                                <Paper
                                    key={lugar.id}
                                    elevation={0}
                                    sx={{ p: 1.5, mb: 1, borderRadius: "12px", bgcolor: "#ffffff", border: "1px solid #fcd34d" }}
                                >
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box sx={{ maxWidth: '70%' }}>
                                            <Typography variant="body2" fontWeight="800" sx={{ color: "#0f172a" }}>
                                                {lugar.nombre}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "#b45309", fontWeight: "600", display: "block" }}>
                                                Motivo: {motivo}
                                            </Typography>
                                        </Box>

                                        <Button
                                            type="link"
                                            size="small"
                                            icon={<OpenInNewIcon style={{ fontSize: 14 }} />}
                                            onClick={() => window.open(`/pagina2/${lugar.id}`, '_blank')}
                                        >
                                            Comparar
                                        </Button>
                                    </Stack>
                                </Paper>
                            ))}
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};