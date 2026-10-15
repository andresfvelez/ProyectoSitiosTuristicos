import React, { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    Stack,
    IconButton,
    Avatar
} from '@mui/material';
import { Button, Form, Input } from 'antd';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LockIcon from '@mui/icons-material/Lock';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useNavigate } from "react-router-dom";

export interface Comentario {
    usuario: string;
    comentario: string;
    puntuacion: number;
    imagenes?: string;
    fecha?: string;
}

interface SeccionComentariosProps {
    comentariosIniciales: Comentario[];
    usuarioLogueado: any;
    onEnviarComentario: (nuevoComentario: { puntuacion: number; comentario: string }) => void;
}

const ETIQUETAS_ESTRELLAS = ["Pésimo", "Regular", "Bueno", "Muy Bueno", "Excelente"];

// Resuelve la URL o formato Base64 para el avatar del autor
const resolverImagenPerfil = (img?: string) => {
    if (!img) return undefined;
    if (img.startsWith('http') || img.startsWith('blob:') || img.startsWith('data:')) {
        return img;
    }
    return `data:image/png;base64,${img}`;
};

const SeccionComentarios: React.FC<SeccionComentariosProps> = ({
                                                                   comentariosIniciales,
                                                                   usuarioLogueado,
                                                                   onEnviarComentario
                                                               }) => {
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const [starsUser, setStarsUser] = useState<boolean[]>([false, false, false, false, false]);
    const [botonDeshabilitado, setBotonDeshabilitado] = useState<boolean>(true);

    // Validación reactiva de formulario (requiere texto válido y al menos una estrella)
    const validarFormulario = (estrellasActuales: boolean[], textoActual?: string) => {
        const texto = textoActual !== undefined ? textoActual : form.getFieldValue("comentario");
        const tieneTexto = Boolean(texto && texto.trim().length > 0);
        const tieneEstrellas = estrellasActuales.some((s) => s === true);

        setBotonDeshabilitado(!(tieneTexto && tieneEstrellas));
    };

    const manejarEstrellas = (index: number) => {
        const newStars = starsUser.map((_, i) => i <= index);
        setStarsUser(newStars);
        validarFormulario(newStars);
    };

    const manejarCambioValores = (changedValues: any) => {
        if ('comentario' in changedValues) {
            validarFormulario(starsUser, changedValues.comentario);
        }
    };

    const totalEstrellasSeleccionadas = starsUser.filter(Boolean).length;

    const alEnviar = () => {
        const puntuacion = starsUser.filter(Boolean).length;
        const comentarioTexto = form.getFieldValue("comentario")?.trim() || "";

        if (puntuacion === 0 || !comentarioTexto) return;

        onEnviarComentario({ puntuacion, comentario: comentarioTexto });
        form.resetFields();
        setStarsUser([false, false, false, false, false]);
        setBotonDeshabilitado(true);
    };

    return (
        <Box sx={{ mt: 10, mb: 5 }}>
            <Typography variant="h4" fontWeight="800" sx={{ mb: 4, color: '#0f172a' }}>
                Comentarios y Valoraciones
            </Typography>

            <Grid container spacing={4}>
                {/* Formulario de registro de opinión */}
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 4, borderRadius: "25px", border: "1px solid #eee", boxShadow: 'none' }}>
                        {usuarioLogueado ? (
                            <>
                                <Typography variant="h6" fontWeight="800" color="#0f172a" gutterBottom>
                                    Comparte tu opinión
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Califica la calidad de la experiencia para orientar a la comunidad de viajeros.
                                </Typography>

                                <Box sx={{ mb: 3 }}>
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        {starsUser.map((active, i) => (
                                            <IconButton
                                                key={i}
                                                onClick={() => manejarEstrellas(i)}
                                                sx={{
                                                    p: 0.5,
                                                    transition: "transform 0.1s",
                                                    "&:hover": { transform: "scale(1.15)" }
                                                }}
                                            >
                                                {active ? (
                                                    <StarIcon sx={{ fontSize: 30, color: "#f59e0b" }} />
                                                ) : (
                                                    <StarBorderIcon sx={{ fontSize: 30, color: "#cbd5e1" }} />
                                                )}
                                            </IconButton>
                                        ))}

                                        {totalEstrellasSeleccionadas > 0 && (
                                            <Typography
                                                variant="caption"
                                                fontWeight="800"
                                                sx={{
                                                    ml: 1,
                                                    color: "#d97706",
                                                    fontSize: "0.85rem"
                                                }}
                                            >
                                                {ETIQUETAS_ESTRELLAS[totalEstrellasSeleccionadas - 1]}
                                            </Typography>
                                        )}
                                    </Stack>
                                </Box>

                                <Form form={form} onValuesChange={manejarCambioValores} onFinish={alEnviar}>
                                    <Form.Item name="comentario" style={{ marginBottom: "20px" }}>
                                        <Input.TextArea
                                            rows={4}
                                            placeholder="Detalla tu experiencia, condiciones de la vía, recomendaciones de transporte o aspectos relevantes del sitio..."
                                            style={{
                                                borderRadius: "20px",
                                                backgroundColor: "#f8fafc",
                                                fontSize: "0.95rem",
                                                border: "2px solid #38bdf8",
                                                padding: "12px 16px",
                                                outline: "none"
                                            }}
                                        />
                                    </Form.Item>

                                    <Button
                                        type="primary"
                                        size="large"
                                        block
                                        htmlType="submit"
                                        disabled={botonDeshabilitado}
                                        style={{
                                            borderRadius: "12px",
                                            height: "48px",
                                            fontWeight: "bold",
                                            fontSize: "0.95rem",
                                            backgroundColor: botonDeshabilitado ? "#e2e8f0" : "#0284c7"
                                        }}
                                    >
                                        Publicar Comentario
                                    </Button>
                                </Form>
                            </>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 2 }}>
                                <LockIcon sx={{ fontSize: 48, color: '#0ea5e9', mb: 1.5 }} />
                                <Typography variant="h6" fontWeight="bold" gutterBottom>
                                    Autenticación requerida
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    Inicia sesión con tu cuenta para calificar este destino y registrar tu testimonio.
                                </Typography>
                                <Button
                                    type="primary"
                                    size="large"
                                    block
                                    onClick={() => navigate('/login')}
                                    style={{ borderRadius: "10px", height: "50px", fontWeight: "bold", backgroundColor: "#0284c7" }}
                                >
                                    Iniciar Sesión
                                </Button>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Historial de comentarios publicados */}
                <Grid item xs={12} md={7}>
                    {comentariosIniciales.length === 0 ? (
                        <Paper
                            sx={{
                                p: 4,
                                borderRadius: "20px",
                                border: "1px dashed #cbd5e1",
                                textAlign: "center",
                                bgcolor: "#f8fafc",
                                boxShadow: "none"
                            }}
                        >
                            <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: "#94a3b8", mb: 1 }} />
                            <Typography variant="subtitle1" fontWeight="700" color="#334155" gutterBottom>
                                Aún no hay opiniones registradas
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Sé el primero en compartir tu experiencia sobre este destino turístico.
                            </Typography>
                        </Paper>
                    ) : (
                        <Stack spacing={3}>
                            {comentariosIniciales.map((c, i) => (
                                <Paper key={i} sx={{ p: 3, borderRadius: "20px", border: "1px solid #f0f0f0", boxShadow: 'none' }}>
                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                        <Avatar
                                            src={resolverImagenPerfil(c.imagenes)}
                                            sx={{ bgcolor: "#0284c7", width: 44, height: 44 }}
                                        >
                                            {c.usuario ? c.usuario.charAt(0).toUpperCase() : "?"}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Box>
                                                    <Typography fontWeight="800" sx={{ color: '#0f172a', fontSize: '0.98rem' }}>
                                                        {c.usuario || "Viajero"}
                                                    </Typography>
                                                    {c.fecha && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {c.fecha}
                                                        </Typography>
                                                    )}
                                                </Box>

                                                <Typography variant="caption" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#f59e0b', fontSize: '0.9rem' }}>
                                                    {c.puntuacion} <StarIcon fontSize="inherit" />
                                                </Typography>
                                            </Stack>

                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.6, wordBreak: 'break-word' }}>
                                                {c.comentario}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};

export default SeccionComentarios;