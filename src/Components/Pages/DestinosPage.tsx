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
import { Tabs, Input, Tag, Spin, Empty, Popconfirm, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EditIcon from "@mui/icons-material/Edit";
import StarIcon from "@mui/icons-material/Star";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";
import { LugarTuristico } from "../models/LugarTuristico";
import {
    obtenerLugares,
    obtenerLugaresPorUsuario,
    obtenerImagenesPorDestino,
    eliminarDestino
} from "../../services/lugaresService";
import BannerImg from "../../Layouts/Images/Banner.png";

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
    rol:any;
    onBorradoExitoso: () => void; // 👈 Función para recargar la lista
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
        // Si el objeto no trae fotos embebidas, traemos la primera foto desde la colección imagenes_b64
        if (!fotoPortada && lugar.id) {
            obtenerImagenesPorDestino(lugar.id).then((fotos) => {
                if (fotos && fotos.length > 0) {
                    setFotoPortada(fotos[0]);
                }
            });
        }
    }, [lugar.id, fotoPortada]);

    // ACCIÓN DE BORRADO
    const handleConfirmarBorrado = async () => {
        if (!lugar.id || !usuario?.uid) return;

        const exito = await eliminarDestino(lugar.id, usuario.uid);
        if (exito) {
            message.success("Destino eliminado y archivado correctamente.");
            onBorradoExitoso(); //  Dispara la recarga inmediata de la vista
        } else {
            message.error("No se pudo eliminar el destino.");
        }
    };

    return (
        <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card sx={{ borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", height: "100%", display: "flex", flexDirection: "column" }}>

                {/* IMAGEN DE PORTADA Y BADGES */}
                <Box sx={{ position: "relative" }}>
                    <CardMedia
                        component="img"
                        height="200"
                        image={getImagenSrc(fotoPortada)}
                        alt={lugar.nombre}
                    />

                    {/* Estado de Moderación (Solo en pestaña 'Mis Destinos') */}
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

                {/* CUERPO DE LA TARJETA */}
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

                {/* ACCIONES DE LA TARJETA */}
                <CardActions sx={{ p: 2, pt: 0 }}>
                    {puedeGestionar ? (
                        <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                            {/* Botón Editar */}
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

                            {/* 🗑️ Botón Borrar */}
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

export default function DestinosPage() {
    const { usuario,rol } = useAuth();

    const [tabActiva, setTabActiva] = useState<string>("1");
    const [busqueda, setBusqueda] = useState<string>("");
    const [cargando, setCargando] = useState<boolean>(true);

    const [todosLosLugares, setTodosLosLugares] = useState<LugarTuristico[]>([]);
    const [misLugares, setMisLugares] = useState<LugarTuristico[]>([]);

    // 🔄 Cargar / Refrescar datos
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

    const filtrarLista = (lista: LugarTuristico[]) => {
        if (!busqueda.trim()) return lista;
        const queryLower = busqueda.toLowerCase();
        return lista.filter(l =>
            l.nombre?.toLowerCase().includes(queryLower) ||
            l.ciudad?.toLowerCase().includes(queryLower) ||
            l.categoria?.toLowerCase().includes(queryLower)
        );
    };

    const listaAMostrar = tabActiva === "1"
        ? filtrarLista(todosLosLugares)
        : filtrarLista(misLugares);

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: "24px", bgcolor: "#f8fafc", mb: 4, border: "1px solid #e2e8f0" }}>
                <Typography variant="h4" fontWeight="900" sx={{ mb: 1, color: "#0f172a" }}>
                    Explora y Gestiona Destinos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Encuentra lugares increíbles o administra los sitios que has compartido con la comunidad.
                </Typography>

                <Input
                    size="large"
                    placeholder="Buscar por nombre de destino, ciudad o categoría..."
                    prefix={<SearchOutlined style={{ color: "#0ea5e9", fontSize: 20 }} />}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    allowClear
                    style={{ borderRadius: "12px", height: "50px", fontSize: "1rem" }}
                />
            </Paper>

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

            <Box sx={{ mt: 3 }}>
                {cargando ? (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                        <Spin size="large" tip="Cargando destinos..." />
                    </Box>
                ) : listaAMostrar.length === 0 ? (
                    <Box sx={{ py: 6 }}>
                        <Empty
                            description={
                                tabActiva === "2"
                                    ? "Aún no has publicado ningún destino."
                                    : "No se encontraron destinos que coincidan con la búsqueda."
                            }
                        />
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {listaAMostrar.map((lugar) => (
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
                )}
            </Box>
        </Container>
    );
}