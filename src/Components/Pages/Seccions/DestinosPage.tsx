import React, { useEffect, useState } from "react";
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardMedia,
    CardContent,
    CardActions,
    Chip,
    Stack,
    Paper,
    Button as MuiButton
} from "@mui/material";
import { Tabs, Input, Tag, Spin, Empty, Popconfirm, message, Select, Pagination } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EditIcon from "@mui/icons-material/Edit";
import StarIcon from "@mui/icons-material/Star";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../auth/AuthProvider";
import { LugarTuristico } from "../../models/LugarTuristico";
import {
    obtenerLugares,
    obtenerLugaresPorUsuario,
    obtenerImagenesPorDestino,
    eliminarDestino,
    reportarLugar
} from "../../../services/lugaresService";


import {
    OPCIONES_CLIMA,
    OPCIONES_ENTORNO,
    OPCIONES_PRESUPUESTO,
    OPCIONES_ACCESO,
    OPCIONES_RITMO
} from "../../models/OpcionesDestinos";

import BannerImg from "../../../Layouts/Images/Banner.png";
import {obtenerCiudadesColombia} from "../../../services/ApiServices";

// Helper para interpretar formato de imagen
const getImagenSrc = (src?: string | null) => {
    if (!src) return BannerImg;
    if (src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:image')) {
        return src;
    }
    return `data:image/png;base64,${src}`;
};

// 🎴 INTERFAZ DE PROPS PARA LA TARJETA
interface TarjetaDestinoProps {
    lugar: LugarTuristico;
    tabActiva: string;
    usuario: any;
    rol: any;
    onBorradoExitoso: () => void;
}

// 🎴 COMPONENTE INDIVIDUAL DE TARJETA
const TarjetaDestino: React.FC<TarjetaDestinoProps> = ({
                                                           lugar,
                                                           tabActiva,
                                                           usuario,
                                                           rol,
                                                           onBorradoExitoso
                                                       }) => {
    const navigate = useNavigate();
    const [fotoPortada, setFotoPortada] = useState<string | null>(
        lugar.imagenes && lugar.imagenes.length > 0 ? lugar.imagenes[0] : null
    );

    const esCreadorEnMisDestinos = tabActiva === "2" && lugar.creadorId === usuario?.uid;
    const esAdmin = rol === 'administrador';
    const puedeGestionar = esCreadorEnMisDestinos || esAdmin;

    useEffect(() => {
        if (!fotoPortada && lugar.id) {
            obtenerImagenesPorDestino(lugar.id).then((fotos) => {
                if (fotos && fotos.length > 0) {
                    setFotoPortada(fotos[0]);
                }
            });
        }
    }, [lugar.id, fotoPortada]);

    const handleConfirmarBorrado = async () => {
        if (!lugar.id || !usuario?.uid) return;

        const exito = await eliminarDestino(lugar.id, usuario.uid);
        if (exito) {
            message.success("Destino eliminado y archivado correctamente.");
            onBorradoExitoso();
        } else {
            message.error("No se pudo eliminar el destino.");
        }
    };

    return (
        <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", height: "100%", display: "flex", flexDirection: "column" }}>
                <Box sx={{ position: "relative" }}>
                    <CardMedia
                        component="img"
                        height="200"
                        image={getImagenSrc(fotoPortada)}
                        alt={lugar.nombre}
                    />

                    {tabActiva === "2" && (
                        <Box sx={{ position: "absolute", top: 12, left: 12 }}>
                            {lugar.confirmado ? (
                                <Tag color="green" style={{ fontWeight: 'bold' }}>APROBADO</Tag>
                            ) : (
                                <Tag color="orange" style={{ fontWeight: 'bold' }}>PENDIENTE REVISIÓN</Tag>
                            )}
                        </Box>
                    )}

                    <Chip
                        label={(lugar.categoria || "aventura").toUpperCase()}
                        size="small"
                        sx={{ position: "absolute", bottom: 12, right: 12, bgcolor: "rgba(15,23,42,0.8)", color: "white", fontWeight: "bold" }}
                    />
                </Box>

                <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                        <LocationOnIcon sx={{ fontSize: 16, color: "#0ea5e9" }} />
                        <Typography variant="caption" fontWeight="800" color="#0ea5e9" sx={{ textTransform: "uppercase" }}>
                            {lugar.ciudad || "Colombia"}
                        </Typography>
                    </Stack>

                    <Typography variant="h6" fontWeight="800" sx={{ mb: 1, fontSize: "1.1rem", lineHeight: 1.3 }}>
                        {lugar.nombre}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        mb: 2
                    }}>
                        {lugar.descripcion}
                    </Typography>

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" fontWeight="900" color="#0ea5e9">
                            ${Number(lugar.minimo || 0).toLocaleString("es-CO")} COP
                        </Typography>

                        {lugar.puntuacion ? (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <StarIcon sx={{ fontSize: 16, color: "#f59e0b" }} />
                                <Typography variant="caption" fontWeight="bold">{lugar.puntuacion}</Typography>
                            </Stack>
                        ) : null}
                    </Stack>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                    {puedeGestionar ? (
                        <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                            <MuiButton
                                variant="outlined"
                                onClick={() => navigate(`/pagina2/${lugar.id}`)}
                                sx={{
                                    borderRadius: "10px",
                                    textTransform: "none",
                                    fontWeight: "bold",
                                    px: 1.5,
                                    minWidth: "auto",
                                    color: "#475569",
                                    borderColor: "#cbd5e1"
                                }}
                            >
                                Ver
                            </MuiButton>
                            <MuiButton
                                fullWidth
                                variant="contained"
                                startIcon={<EditIcon />}
                                onClick={() => navigate(`/editar-destino/${lugar.id}`)}
                                sx={{ bgcolor: "#0284c7", borderRadius: "10px", textTransform: "none", fontWeight: "bold" }}
                            >
                                Editar
                            </MuiButton>

                            <Popconfirm
                                title="¿Eliminar destino?"
                                description="Se moverá a auditoría y ya no será visible."
                                onConfirm={handleConfirmarBorrado}
                                okText="Sí, eliminar"
                                cancelText="Cancelar"
                                okButtonProps={{ danger: true }}
                            >
                                <MuiButton
                                    variant="outlined"
                                    color="error"
                                    sx={{ borderRadius: "10px", minWidth: "45px", px: 1 }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </MuiButton>
                            </Popconfirm>
                        </Stack>
                    ) : (
                        <MuiButton
                            fullWidth
                            variant="outlined"
                            onClick={() => navigate(`/pagina2/${lugar.id}`)}
                            sx={{ borderRadius: "10px", textTransform: "none", fontWeight: "bold" }}
                        >
                            Ver Detalle
                        </MuiButton>
                    )}
                </CardActions>
            </Card>
        </Grid>
    );
};

// 🏛️ PÁGINA PRINCIPAL
export default function DestinosPage() {
    const { usuario, rol } = useAuth();

    const [tabActiva, setTabActiva] = useState<string>("1");
    const [busqueda, setBusqueda] = useState<string>("");
    const [cargando, setCargando] = useState<boolean>(true);

    // 🌟 ESTADO ÚNICO DE CIUDADES
    const [opcionesCiudades, setOpcionesCiudades] = useState<{ label: string; value: string }[]>([]);
    const [cargandoCiudades, setCargandoCiudades] = useState<boolean>(false);

    // ESTADO DE PAGINACIÓN DINÁMICA
    const [paginaActual, setPaginaActual] = useState<number>(1);
    const [elementosPorPagina, setElementosPorPagina] = useState<number>(12);

    // ESTADOS DE FILTROS MAESTROS
    const [filtroCiudad, setFiltroCiudad] = useState<string | null>(null);
    const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
    const [filtroClima, setFiltroClima] = useState<string | null>(null);
    const [filtroEntorno, setFiltroEntorno] = useState<string | null>(null);
    const [filtroPresupuesto, setFiltroPresupuesto] = useState<string | null>(null);
    const [filtroAcceso, setFiltroAcceso] = useState<string | null>(null);
    const [filtroRitmo, setFiltroRitmo] = useState<string | null>(null);

    const [todosLosLugares, setTodosLosLugares] = useState<LugarTuristico[]>([]);
    const [misLugares, setMisLugares] = useState<LugarTuristico[]>([]);

    const cargarData = async () => {
        setCargando(true);
        const publicos = await obtenerLugares();
        setTodosLosLugares(publicos);

        if (usuario?.uid) {
            const propios = await obtenerLugaresPorUsuario(usuario.uid);
            setMisLugares(propios);
        }

        setCargando(false);
    };

    useEffect(() => {
        cargarData();
    }, [usuario]);

    // 📍 ÚNICO EFFECT PARA CARGAR TODAS LAS CIUDADES DESDE EL SERVICIO API
    useEffect(() => {
        const fetchCiudades = async () => {
            setCargandoCiudades(true);
            const ciudades = await obtenerCiudadesColombia();

            const opciones = ciudades.map((c) => ({
                label: `📍 ${c.label}`,
                value: c.value
            }));

            setOpcionesCiudades(opciones);
            setCargandoCiudades(false);
        };

        fetchCiudades();
    }, []);

    // RESETEAR A LA PÁGINA 1 SI CAMBIA CUALQUIER FILTRO
    useEffect(() => {
        setPaginaActual(1);
    }, [
        busqueda,
        filtroCiudad,
        filtroCategoria,
        filtroClima,
        filtroEntorno,
        filtroPresupuesto,
        filtroAcceso,
        filtroRitmo,
        tabActiva
    ]);

    // Filtrado multinivel
    const filtrarLista = (lista: LugarTuristico[]) => {
        return lista.filter((l) => {
            const queryLower = busqueda.toLowerCase().trim();
            const matchTexto =
                !queryLower ||
                l.nombre?.toLowerCase().includes(queryLower) ||
                l.descripcion?.toLowerCase().includes(queryLower) ||
                l.ciudad?.toLowerCase().includes(queryLower);

            const matchCiudad = !filtroCiudad || l.ciudad?.toLowerCase() === filtroCiudad.toLowerCase();
            const matchCategoria = !filtroCategoria || l.categoria?.toLowerCase() === filtroCategoria.toLowerCase();
            const matchClima = !filtroClima || (l as any).clima === filtroClima;
            const matchEntorno = !filtroEntorno || (l as any).entorno === filtroEntorno;
            const matchPresupuesto = !filtroPresupuesto || (l as any).rangoPresupuesto === filtroPresupuesto;
            const matchAcceso = !filtroAcceso || (l as any).tipoAcceso === filtroAcceso;
            const matchRitmo = !filtroRitmo || (l as any).ritmo === filtroRitmo;

            return (
                matchTexto &&
                matchCiudad &&
                matchCategoria &&
                matchClima &&
                matchEntorno &&
                matchPresupuesto &&
                matchAcceso &&
                matchRitmo
            );
        });
    };

    const hayFiltrosActivos = Boolean(
        busqueda ||
        filtroCiudad ||
        filtroCategoria ||
        filtroClima ||
        filtroEntorno ||
        filtroPresupuesto ||
        filtroAcceso ||
        filtroRitmo
    );

    const limpiarFiltros = () => {
        setBusqueda("");
        setFiltroCiudad(null);
        setFiltroCategoria(null);
        setFiltroClima(null);
        setFiltroEntorno(null);
        setFiltroPresupuesto(null);
        setFiltroAcceso(null);
        setFiltroRitmo(null);
    };

    const listaFiltrada = tabActiva === "1"
        ? filtrarLista(todosLosLugares)
        : filtrarLista(misLugares);

    // CÁLCULO DE ELEMENTOS PARA LA PÁGINA ACTUAL
    const inicioIndex = (paginaActual - 1) * elementosPorPagina;
    const finIndex = inicioIndex + elementosPorPagina;
    const listaPaginada = listaFiltrada.slice(inicioIndex, finIndex);

    const handleCambioPagina = (page: number, pageSize?: number) => {
        setPaginaActual(page);
        if (pageSize && pageSize !== elementosPorPagina) {
            setElementosPorPagina(pageSize);
            setPaginaActual(1);
        }
        window.scrollTo({ top: 380, behavior: "smooth" });
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* PANEL DE FILTROS */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 3, md: 4 },
                    borderRadius: "24px",
                    bgcolor: "#ffffff",
                    mb: 4,
                    border: "1px solid #cbd5e1",
                    boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.05)"
                }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                    <Box>
                        <Typography variant="h4" fontWeight="900" sx={{ color: "#0f172a", fontSize: { xs: "1.5rem", md: "2rem" } }}>
                            Explora y Gestiona Destinos
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#64748b", fontWeight: "500" }}>
                            Encuentra lugares increíbles o administra los sitios que has compartido con la comunidad.
                        </Typography>
                    </Box>

                    {hayFiltrosActivos && (
                        <MuiButton
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<ReloadOutlined />}
                            onClick={limpiarFiltros}
                            sx={{
                                borderRadius: "10px",
                                textTransform: "none",
                                fontWeight: "800",
                                borderColor: "#fca5a5"
                            }}
                        >
                            Limpiar Filtros
                        </MuiButton>
                    )}
                </Stack>

                {/* BÚSQUEDA PRINCIPAL */}
                <Typography variant="caption" fontWeight="800" sx={{ color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.5px", mb: 1, display: "block" }}>
                    🔍 Búsqueda Principal
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2.5 }}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#334155", mb: 0.5 }}>
                            Texto o palabra clave:
                        </Typography>
                        <Input
                            size="large"
                            placeholder="Ej: Tayrona, cascada, Cali..."
                            prefix={<SearchOutlined style={{ color: "#0ea5e9", fontSize: 18 }} />}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            allowClear
                            style={{ borderRadius: "10px", height: "44px", border: "1px solid #94a3b8" }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#334155", mb: 0.5 }}>
                            Ubicación:
                        </Typography>
                        <Select
                            showSearch
                            allowClear
                            loading={cargandoCiudades}
                            placeholder="Todas las ciudades"
                            value={filtroCiudad}
                            onChange={setFiltroCiudad}
                            style={{ width: "100%", height: "44px" }}
                            size="large"
                            options={opcionesCiudades}
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#334155", mb: 0.5 }}>
                            Categoría:
                        </Typography>
                        <Select
                            allowClear
                            placeholder="Todas las categorías"
                            value={filtroCategoria}
                            onChange={setFiltroCategoria}
                            style={{ width: "100%", height: "44px" }}
                            size="large"
                            options={[
                                { label: '🏔️ Aventura', value: 'aventura' },
                                { label: '🍽️ Restaurante', value: 'restaurante' },
                                { label: '🏨 Hotel', value: 'hotel' }
                            ]}
                        />
                    </Grid>
                </Grid>

                {/* FILTROS DE EXPERIENCIA */}
                <Typography variant="caption" fontWeight="800" sx={{ color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.5px", mb: 1, display: "block" }}>
                    🎯 Filtros por Experiencia
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#334155", mb: 0.5 }}>
                            Clima:
                        </Typography>
                        <Select
                            allowClear
                            placeholder="Todos los climas"
                            value={filtroClima}
                            onChange={setFiltroClima}
                            style={{ width: "100%", height: "44px" }}
                            size="large"
                            options={OPCIONES_CLIMA}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#334155", mb: 0.5 }}>
                            Entorno:
                        </Typography>
                        <Select
                            allowClear
                            placeholder="Todos los entornos"
                            value={filtroEntorno}
                            onChange={setFiltroEntorno}
                            style={{ width: "100%", height: "44px" }}
                            size="large"
                            options={OPCIONES_ENTORNO}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#334155", mb: 0.5 }}>
                            Presupuesto:
                        </Typography>
                        <Select
                            allowClear
                            placeholder="Todos los rangos"
                            value={filtroPresupuesto}
                            onChange={setFiltroPresupuesto}
                            style={{ width: "100%", height: "44px" }}
                            size="large"
                            options={OPCIONES_PRESUPUESTO}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#334155", mb: 0.5 }}>
                            Modo de Acceso:
                        </Typography>
                        <Select
                            allowClear
                            placeholder="Todos los accesos"
                            value={filtroAcceso}
                            onChange={setFiltroAcceso}
                            style={{ width: "100%", height: "44px" }}
                            size="large"
                            options={OPCIONES_ACCESO}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                        <Typography variant="body2" fontWeight="700" sx={{ color: "#334155", mb: 0.5 }}>
                            Ritmo del Plan:
                        </Typography>
                        <Select
                            allowClear
                            placeholder="Todos los ritmos"
                            value={filtroRitmo}
                            onChange={setFiltroRitmo}
                            style={{ width: "100%", height: "44px" }}
                            size="large"
                            options={OPCIONES_RITMO}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* PESTAÑAS */}
            <Tabs
                activeKey={tabActiva}
                onChange={setTabActiva}
                size="large"
                items={[
                    {
                        key: "1",
                        label: `🌏 Destinos Turísticos (${todosLosLugares.length})`,
                    },
                    ...(usuario ? [{
                        key: "2",
                        label: `👤 Mis Destinos Publicados (${misLugares.length})`,
                    }] : [])
                ]}
            />

            {/* GRID DE DESTINOS PAGINADO */}
            <Box sx={{ mt: 3 }}>
                {cargando ? (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                        <Spin size="large" tip="Cargando destinos..." />
                    </Box>
                ) : listaFiltrada.length === 0 ? (
                    <Box sx={{ py: 6 }}>
                        <Empty
                            description={
                                tabActiva === "2"
                                    ? "Aún no has publicado ningún destino."
                                    : "No se encontraron destinos que coincidan con los filtros seleccionados."
                            }
                        />
                    </Box>
                ) : (
                    <>
                        <Grid container spacing={3}>
                            {listaPaginada.map((lugar) => (
                                <TarjetaDestino
                                    key={lugar.id}
                                    lugar={lugar}
                                    tabActiva={tabActiva}
                                    usuario={usuario}
                                    rol={rol}
                                    onBorradoExitoso={cargarData}
                                />
                            ))}
                        </Grid>

                        {/* CONTROLES DE PAGINACIÓN */}
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                mt: 6,
                                mb: 2,
                                p: 2,
                                bgcolor: "#ffffff",
                                borderRadius: "16px",
                                border: "1px solid #cbd5e1",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
                            }}
                        >
                            <Pagination
                                current={paginaActual}
                                pageSize={elementosPorPagina}
                                total={listaFiltrada.length}
                                onChange={handleCambioPagina}
                                showSizeChanger={true}
                                pageSizeOptions={['8', '12', '16', '24', '32']}
                                showTotal={(total, range) => (
                                    <Typography variant="caption" fontWeight="700" sx={{ color: "#475569", mr: 2 }}>
                                        Mostrando {range[0]}-{range[1]} de {total} destinos
                                    </Typography>
                                )}
                            />
                        </Box>
                    </>
                )}
            </Box>
        </Container>
    );
}